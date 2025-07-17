require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const { checknull } = require("../Global/checknull");
const products = require("../Models/products");
const products_log = require("../Models/products_log");
const product_units = require("../Models/product_units");
const product_categories = require("../Models/product_categories");
const product_brands = require("../Models/product_brands");
const product_units_details = require("../Models/product_units_details");
const product_units_details_log = require("../Models/product_units_details_log");
const { environment } = require("../Global/environment");
const inventories = require("../Models/inventories");
const { default: mongoose } = require("mongoose");
const { Parser, parseAsync } = require("json2csv");
const csv = require("fast-csv");
const { type } = require("os");
const { parse } = require("fast-csv");

const Environment = environment();

const UPLOAD =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_UPLOAD
    : Environment === "TESTING"
    ? process.env.TESTING_UPLOAD
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_UPLOAD
    : Environment === "LOCAL"
    ? process.env.LOCAL_UPLOAD
    : "";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const authorize = authorization(req);

    const dir = path.join(UPLOAD, "products", "products");
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png/;
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedFileTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png)."));
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
}).single("image");
const add_file = (req) => {
  let image_path = req?.file
    ? path
        .join("/products/products", path.basename(req.file.path))
        .replace(/\\/g, "/")
    : "";
  return image_path;
};
const remove_file = (filePath, res) => {
  let image_path = path?.join(UPLOAD, filePath);

  if (filePath) {
    fs.unlink(image_path, (errors) => {
      if (errors) {
        console.log(errors?.message);
      }
    });
  }
};

const get_create_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const all_units = await product_units?.find({
        branch: authorize?.branch,
      });
      const all_brands = await product_brands?.find({
        branch: authorize?.branch,
      });
      const all_categories = await product_categories?.find({
        branch: authorize?.branch,
      });

      const data = {
        units: all_units,
        brands: all_brands,
        categories: all_categories,
      };

      success_200(res, "", data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      upload(req, res, async (errors) => {
        if (errors) {
          failed_400(res, errors?.message);
        } else {
          const {
            name,
            barcode,
            unit,
            category,
            brand,
            purchase_price,
            sale_price,
            wholesale_price,
            stock,
            expiry,
            tax,
            type,
            details,
            status,
            branch,
          } = req?.body;

          if (!name) {
            incomplete_400(res);
          } else {
            const selected_product_name = await products.findOne({
              name: name,
              branch: branch ? branch : authorize?.branch,
              status: { $ne: 2 },
            });

            if (selected_product_name) {
              remove_file(add_file(req), res);
              failed_400(res, "Product name exists");
            } else {
              const selected_product_barcode = await products.findOne({
                $and: [
                  { barcode: { $ne: "" } },
                  { barcode },
                  { branch: branch || authorize?.branch },
                  { status: { $ne: 2 } },
                ],
              });

              if (selected_product_barcode) {
                remove_file(add_file(req), res);
                failed_400(res, "Product barcode exists");
              } else {
                const product = new products({
                  image: add_file(req, res),
                  name: name,
                  barcode: barcode,
                  unit: checknull(unit),
                  category: checknull(category),
                  brand: checknull(brand),
                  purchase_price: purchase_price,
                  sale_price: sale_price,
                  wholesale_price: wholesale_price,
                  stock: stock ? stock : 0,
                  expiry: expiry ? expiry : 0,
                  tax: tax ? tax : 0,
                  type: type ? type : 0,
                  stock: stock ? stock : 0,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const product_save = await product?.save();

                // product unit details creation
                const unit_details = JSON?.parse?.(details);

                if (unit_details?.length > 0) {
                  let total = unit_details?.length;
                  let count = 0;

                  for (value of unit_details) {
                    if (value?.name) {
                      let unit_sale_price =
                        parseFloat(sale_price || 0) /
                        parseFloat(value?.conversion || 0);
                      let unit_wholesale_price =
                        parseFloat(wholesale_price || 0) /
                        parseFloat(value?.conversion || 0);
                      let unit_purchase_price =
                        parseFloat(purchase_price || 0) /
                        parseFloat(value?.conversion || 0);

                      const unit_detail = new product_units_details({
                        product: product_save?._id,
                        name: value?.name,
                        conversion: value?.conversion ? value?.conversion : 0,
                        sale_price: unit_sale_price,
                        wholesale_price: unit_wholesale_price,
                        purchase_price: unit_purchase_price,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                      const unit_detail_save = await unit_detail?.save();
                      count++;
                    } else {
                      count++;
                    }
                  }

                  if (total == count) {
                    success_200(res, "Product created");
                  } else {
                    failed_400(res, "Product units not created");
                  }
                } else {
                  success_200(res, "Product created");
                }
              }
            }
          }
        }
      });
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

// const create_bulk_product = async (req, res) => {
//   try {
//     const authorize = authorization(req);

//     if (authorize) {
//       const { details, branch } = req?.body;

//       if (details?.length <= 0 || !branch) {
//         return incomplete_400(res);
//       }

//       const productNames = details.map((value) => value?.name);
//       const productBarcodes = details.map((value) => value?.barcode);
//       const unitNames = details.map((value) => value?.unit);
//       const categoryNames = details.map((value) => value?.category);
//       const brandNames = details.map((value) => value?.brand);

//       // Parallelize database queries
//       const [existingProducts, units, categories, brands] = await Promise.all([
//         products.find({ name: { $in: productNames }, branch }),
//         product_units.find({ name: { $in: unitNames }, branch }),
//         product_categories.find({ name: { $in: categoryNames }, branch }),
//         product_brands.find({ name: { $in: brandNames }, branch }),
//       ]);

//       const existingProductNames = existingProducts.map((p) => p.name);
//       const existingBarcodes = existingProducts.map((p) => p.barcode);

//       const unitMap = units.reduce((map, unit) => {
//         map[unit.name.trim().toLowerCase()] = unit._id;
//         return map;
//       }, {});

//       const categoryMap = categories.reduce((map, category) => {
//         map[category.name] = category._id;
//         return map;
//       }, {});

//       const brandMap = brands.reduce((map, brand) => {
//         map[brand.name] = brand._id;
//         return map;
//       }, {});

//       let count = 0;
//       const bulkProducts = [];
//       const bulkUnitDetails = [];
//       const bulkUnits = [];

//       for (let value of details) {
//         if (
//           !value?.name ||
//           existingProductNames.includes(value?.name) ||
//           existingBarcodes.includes(value?.barcode)
//         ) {
//           continue; // Skip if product already exists
//         }

//         const selectedUnitId = unitMap[value?.unit] || null;
//         const selectedCategoryId = categoryMap[value?.category] || null;
//         const selectedBrandId = brandMap[value?.brand] || null;

//         const product = new products({
//           name: value?.name,
//           barcode: value?.barcode,
//           unit: selectedUnitId,
//           category: selectedCategoryId,
//           brand: selectedBrandId,
//           stock: value?.stock || 0,
//           expiry: value?.expiry || 0,
//           sale_price: value?.sale_price || 0,
//           wholesale_price: value?.wholesale_price || 0,
//           purchase_price: value?.purchase_price || 0,
//           expiry: value?.expiry || 0,
//           tax: value?.tax || 0,
//           type: value?.type || 0,
//           status: value?.status || 0,
//           ref: authorize?.ref,
//           branch: branch,
//           created: new Date(),
//           created_by: authorize?.id,
//         });

//         bulkProducts.push(product);

//         if (value?.details?.length > 0) {
//           value?.details.forEach((v) => {
//             // const selectedProductUnitId = unitMap[v?.name];
//             const unitKey = v?.name?.trim().toLowerCase();
//             const selectedProductUnitId = unitMap[unitKey];

//             // const selectedProductUnitId = product_units?.findOne({
//             //   name: v?.name,
//             // });

//             if (selectedProductUnitId) {
//               const unitDetail = {
//                 product: product._id,
//                 name: selectedProductUnitId,
//                 conversion: v?.conversion || 0,
//                 sale_price: v?.sale_price || 0,
//                 wholesale_price: v?.wholesale_price || 0,
//                 purchase_price: v?.purchase_price || 0,
//                 status: v?.status || 0,
//                 ref: authorize?.ref,
//                 branch: branch,
//                 created: new Date(),
//                 created_by: authorize?.id,
//               };
//               bulkUnitDetails.push(unitDetail);
//             } else {
//               // If unit doesn't exist, create new unit and unit details
//               const productUnit = new product_units({
//                 name: v?.name,
//                 status: 1,
//                 ref: authorize?.ref,
//                 branch: branch,
//                 created: new Date(),
//                 created_by: authorize?.id,
//               });
//               bulkUnits.push(productUnit);

//               const unitDetail = {
//                 product: product._id,
//                 name: productUnit._id,
//                 conversion: v?.conversion || 0,
//                 sale_price: v?.sale_price || 0,
//                 wholesale_price: v?.wholesale_price || 0,
//                 purchase_price: v?.purchase_price || 0,
//                 status: v?.status || 0,
//                 ref: authorize?.ref,
//                 branch: branch,
//                 created: new Date(),
//                 created_by: authorize?.id,
//               };
//               bulkUnitDetails.push(unitDetail);
//             }
//           });
//         }
//       }

//       // Bulk insert products, units, and unit details in parallel
//       const bulkProductOps = bulkProducts.map((product) => ({
//         insertOne: { document: product },
//       }));

//       const bulkUnitOps = bulkUnits.map((unit) => ({
//         insertOne: { document: unit },
//       }));

//       const bulkUnitDetailOps = bulkUnitDetails.map((unitDetail) => ({
//         insertOne: { document: unitDetail },
//       }));

//       // Execute all bulk operations
//       if (bulkProductOps.length > 0) {
//         await products.bulkWrite(bulkProductOps);
//       }

//       if (bulkUnitOps.length > 0) {
//         await product_units.bulkWrite(bulkUnitOps);
//       }

//       if (bulkUnitDetailOps.length > 0) {
//         await product_units_details.bulkWrite(bulkUnitDetailOps);
//       }

//       count = bulkProductOps.length;

//       if (count === details?.length) {
//         success_200(res, "Products imported");
//       } else {
//         failed_400(res, "Product import failed");
//       }
//     } else {
//       unauthorized(res);
//     }
//   } catch (errors) {
//     catch_400(res, errors?.message);
//   }
// };

const create_bulk_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) return unauthorized(res);

    const { details, branch } = req.body;

    if (!branch || !details?.length) return incomplete_400(res);

    const productNames = details.map((v) => v?.name?.trim());
    const productBarcodes = details.map((v) => v?.barcode?.trim());
    const unitNames = details.flatMap((v) => [
      v?.unit,
      ...(v?.details || []).map((d) => d?.name),
    ]);
    const categoryNames = details.map((v) => v?.category?.trim());
    const brandNames = details.map((v) => v?.brand?.trim());

    // Fetch all existing data
    const [existingProducts, units, categories, brands] = await Promise.all([
      products.find({ name: { $in: productNames }, branch }),
      product_units.find({ name: { $in: unitNames }, branch }),
      product_categories.find({ name: { $in: categoryNames }, branch }),
      product_brands.find({ name: { $in: brandNames }, branch }),
    ]);

    const existingProductNames = existingProducts.map((p) => p.name);
    const existingBarcodes = existingProducts.map((p) => p.barcode);

    // Create maps for quick ID lookup
    const unitMap = units.reduce((map, unit) => {
      map[unit.name.trim().toLowerCase()] = unit._id;
      return map;
    }, {});

    const categoryMap = categories.reduce((map, c) => {
      map[c.name?.trim()] = c._id;
      return map;
    }, {});

    const brandMap = brands.reduce((map, b) => {
      map[b.name?.trim()] = b._id;
      return map;
    }, {});

    const bulkProducts = [];
    const bulkUnits = [];
    const bulkUnitDetails = [];
    const createdUnitNames = new Set(); // Prevent duplicate unit creation

    for (let value of details) {
      // const name = value?.name?.trim();
      const name = value?.name;
      const barcode = value?.barcode?.trim();
      if (
        !name ||
        existingProductNames.includes(name)
        // || existingBarcodes.includes(barcode)
      )
        continue;

      const unitId = unitMap[value?.unit?.trim()?.toLowerCase()] || null;
      const categoryId = categoryMap[value?.category?.trim()] || null;
      const brandId = brandMap[value?.brand?.trim()] || null;

      const product = new products({
        name,
        barcode,
        unit: unitId,
        category: categoryId,
        brand: brandId,
        stock: value?.stock || 0,
        expiry: value?.expiry || 0,
        sale_price: value?.sale_price || 0,
        wholesale_price: value?.wholesale_price || 0,
        purchase_price: value?.purchase_price || 0,
        tax: value?.tax || 0,
        type: value?.type || 0,
        status: value?.status || 1,
        ref: authorize?.ref,
        branch,
        created: new Date(),
        created_by: authorize?.id,
      });

      bulkProducts.push(product);

      if (Array.isArray(value?.details)) {
        for (let v of value.details) {
          const unitKey = v?.name?.trim()?.toLowerCase();
          if (!unitKey) continue;

          let unitId = unitMap[unitKey];

          // Create new unit if not exists
          if (!unitId && !createdUnitNames.has(unitKey)) {
            const newUnit = new product_units({
              name: v?.name?.trim(),
              status: 1,
              ref: authorize?.ref,
              branch,
              created: new Date(),
              created_by: authorize?.id,
            });

            bulkUnits.push(newUnit);
            unitId = newUnit._id;

            unitMap[unitKey] = unitId;
            createdUnitNames.add(unitKey);
          }

          // Add unit details (always)
          bulkUnitDetails.push({
            product: product._id,
            name: unitId,
            conversion: v?.conversion || 0,
            sale_price: v?.sale_price || 0,
            wholesale_price: v?.wholesale_price || 0,
            purchase_price: v?.purchase_price || 0,
            status: v?.status || 0,
            ref: authorize?.ref,
            branch,
            created: new Date(),
            created_by: authorize?.id,
          });
        }
      }
    }

    // Execute bulk inserts
    if (bulkProducts.length > 0) {
      await products.bulkWrite(
        bulkProducts.map((doc) => ({ insertOne: { document: doc } }))
      );
    }

    if (bulkUnits.length > 0) {
      await product_units.bulkWrite(
        bulkUnits.map((doc) => ({ insertOne: { document: doc } }))
      );
    }

    if (bulkUnitDetails.length > 0) {
      await product_units_details.bulkWrite(
        bulkUnitDetails.map((doc) => ({ insertOne: { document: doc } }))
      );
    }

    if (bulkProducts.length === details.length) {
      success_200(res, "Products imported");
    } else {
      failed_400(res, "Some products were skipped due to duplicates");
    }
  } catch (error) {
    catch_400(res, error?.message);
  }
};

const update_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      upload(req, res, async (errors) => {
        if (errors) {
          failed_400(res, errors?.message);
        } else {
          const {
            id,
            name,
            barcode,
            unit,
            category,
            brand,
            purchase_price,
            sale_price,
            wholesale_price,
            stock,
            expiry,
            tax,
            type,
            status,
            details,
            branch,
          } = req?.body;

          if (!id || !name) {
            incomplete_400(res);
          } else {
            const selected_product = await products?.findById(id);

            if (!selected_product || selected_product.status == 2) {
              remove_file(add_file(req), res);
              failed_400(res, "Product not found");
            } else {
              const selected_product_name = await products.findOne({
                _id: { $ne: id },
                name: name,
                branch: branch ? branch : authorize?.branch,
                status: { $ne: 2 },
              });

              if (selected_product_name) {
                remove_file(add_file(req), res);
                failed_400(res, "Product name exists");
              } else {
                const selected_product_barcode = await products.findOne({
                  $and: [
                    { _id: { $ne: id } },
                    { barcode: { $ne: "" } },
                    { barcode },
                    { branch: branch || authorize?.branch },
                    { status: { $ne: 2 } },
                  ],
                });

                if (selected_product_barcode) {
                  remove_file(add_file(req), res);
                  failed_400(res, "Product barcode exists");
                } else {
                  const product_log = new products_log({
                    product: selected_product?._id,
                    image: selected_product?.image,
                    name: selected_product?.name,
                    barcode: selected_product?.barcode,
                    unit: selected_product?.unit,
                    category: selected_product?.category,
                    brand: selected_product?.brand,
                    purchase_price: selected_product?.purchase_price,
                    sale_price: selected_product?.sale_price,
                    wholesale_price: selected_product?.wholesale_price,
                    stock: selected_product?.stock,
                    expiry: selected_product?.expiry,
                    tax: selected_product?.tax,
                    type: selected_product?.type,
                    status: selected_product?.status,
                    ref: selected_product?.ref,
                    branch: selected_product?.branch,
                    updated: new Date(),
                    updated_by: authorize?.id,
                  });
                  const product_log_save = await product_log?.save();

                  if (!req?.file && selected_product.image) {
                    remove_file(selected_product?.image, res);
                    selected_product.image = "";
                  } else if (req?.file && !selected_product.image) {
                    selected_product.image = add_file(req, res);
                  } else if (req?.file && selected_product.image) {
                    remove_file(selected_product?.image, res);
                    selected_product.image = add_file(req, res);
                  } else {
                    selected_product.image = "";
                  }

                  selected_product.name = name;
                  selected_product.barcode = barcode;
                  selected_product.unit = checknull(unit);
                  selected_product.category = checknull(category);
                  selected_product.brand = checknull(brand);
                  selected_product.purchase_price = purchase_price
                    ? purchase_price
                    : 0;
                  selected_product.sale_price = sale_price ? sale_price : 0;
                  selected_product.wholesale_price = wholesale_price
                    ? wholesale_price
                    : 0;
                  selected_product.stock = stock ? stock : 0;
                  selected_product.expiry = expiry ? expiry : 0;
                  selected_product.tax = tax ? tax : 0;
                  selected_product.type = type ? type : 0;
                  selected_product.status = status ? status : 0;
                  selected_product.branch = branch ? branch : authorize?.branch;
                  selected_product.created = new Date();
                  selected_product.created_by = authorize?.id;

                  const product_update = await selected_product?.save();

                  // product unit details update
                  const selected_product_unit_details_delete =
                    await product_units_details?.deleteMany({
                      product: selected_product?._id,
                    });

                  const unit_details = JSON?.parse?.(details);

                  if (unit_details?.length > 0) {
                    let total = unit_details?.length;
                    let count = 0;

                    for (value of unit_details) {
                      if (value?.name) {
                        let unit_sale_price =
                          parseFloat(sale_price || 0) /
                          parseFloat(value?.conversion || 0);
                        let unit_wholesale_price =
                          parseFloat(wholesale_price || 0) /
                          parseFloat(value?.conversion || 0);
                        let unit_purchase_price =
                          parseFloat(purchase_price || 0) /
                          parseFloat(value?.conversion || 0);

                        const unit_detail = new product_units_details({
                          product: product_update?._id,
                          name: value?.name,
                          conversion: value?.conversion ? value?.conversion : 0,
                          sale_price: unit_sale_price,
                          wholesale_price: unit_wholesale_price,
                          purchase_price: unit_purchase_price,
                          status: status ? status : 0,
                          ref: authorize?.ref,
                          branch: branch ? branch : authorize?.branch,
                          created: new Date(),
                          created_by: authorize?.id,
                        });

                        const unit_detail_save = await unit_detail?.save();
                        count++;
                      } else {
                        count++;
                      }
                    }

                    if (total == count) {
                      success_200(res, "Product updated");
                    } else {
                      failed_400(res, "Product units not created");
                    }
                  } else {
                    success_200(res, "Product updated");
                  }
                }
              }
            }
          }
        }
      });
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product = await products.findById(id);

        if (!selected_product || selected_product.status == 2) {
          failed_400(res, "Product not found");
        } else {
          const product_log = new products_log({
            product: selected_product._id,
            image: selected_product.image,
            name: selected_product.name,
            barcode: selected_product.barcode,
            unit: selected_product.unit,
            category: selected_product.category,
            brand: selected_product.brand,
            purchase_price: selected_product?.purchase_price,
            sale_price: selected_product?.sale_price,
            stock: selected_product?.stock,
            expiry: selected_product?.expiry,
            tax: selected_product?.tax,
            type: selected_product?.type,
            status: selected_product?.status,
            ref: selected_product.ref,
            branch: selected_product.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_log_save = await product_log.save();

          selected_product.status = 2;
          const product_delete = await selected_product.save();

          const selected_product_unit_details =
            await product_units_details?.find({
              product: selected_product?._id,
            });

          let count = 0;

          if (selected_product_unit_details?.length > 0) {
            for (value of selected_product_unit_details) {
              const product_unit_detail_log = new product_units_details_log({
                product_unit: value?._id,
                product: value?.product,
                name: value?.name,
                conversion: value?.conversion,
                status: value?.status,
                ref: value?.ref,
                branch: value?.branch,
                updated: new Date(),
                updated_by: authorize?.id,
              });

              const product_unit_detail_log_save =
                await product_unit_detail_log?.save();
              count++;
            }

            if (count == selected_product_unit_details?.length) {
              success_200(res, "Product updated");
            } else {
              failed_400(res, "Product delete failed");
            }
          } else {
            success_200(res, "Product deleted");
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

const get_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product = await products
          ?.findById(id)
          ?.populate({ path: "unit", match: { status: 1 } })
          ?.populate({ path: "category", match: { status: 1 } })
          ?.populate({ path: "brand", match: { status: 1 } });

        if (!selected_product || selected_product?.status == 2) {
          failed_400(res, "Product not found");
        } else {
          const product = selected_product?.toObject();
          const product_unit_details = await product_units_details
            ?.find({
              product: selected_product?._id,
            })
            ?.populate("name");

          success_200(res, "", {
            ...product,
            product_units_details: product_unit_details,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_name = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, branch } = req?.body;

      if (!name || !branch) {
        incomplete_400(res);
      } else {
        const selected_product = await products?.findOne({
          name: name,
          branch: branch,
          status: 1,
        });
        // ?.populate({ path: "unit", match: { status: 1 } })
        // ?.populate({ path: "category", match: { status: 1 } })
        // ?.populate({ path: "brand", match: { status: 1 } });

        if (!selected_product || selected_product?.status == 2) {
          failed_400(res, "Product not found in branch");
        } else {
          const product = selected_product?.toObject();
          const product_unit_details = await product_units_details
            ?.find({
              product: selected_product?._id,
            })
            ?.populate("name");

          success_200(res, "", {
            ...product,
            product_units_details: product_unit_details,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_products = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, unit, category, brand, type, status, page, limit } =
      req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const branchObjectId = new mongoose.Types.ObjectId(authorize?.branch);
    // const branchObjectId = authorize?.branch;

    const productList = {
      branch: branchObjectId,
      status: { $ne: 2 },
      ref: authorize?.ref,
    };

    // console.log(branchObjectId, "branchObjectId");

    if (search) {
      productList.$or = [
        // { name: { $regex: search, $options: "i" } },
        { name: { $regex: `^${search}`, $options: "i" } },
        { barcode: search },
      ];
    }

    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    const inventorySort =
      sort === 2
        ? { total_inventory: 1 }
        : sort === 3
        ? { total_inventory: -1 }
        : { name: 1 };

    // Fetch paginated products first
    const initialProducts = await products
      .aggregate([
        { $match: productList },
        { $sort: inventorySort },
        { $skip: (page_number - 1) * page_limit },
        { $limit: page_limit },
      ])
      .exec();

    const productIds = initialProducts.map((p) => p._id);

    // Fetch inventory for these products
    const finalProducts = await products
      .aggregate([
        { $match: { _id: { $in: productIds } } },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product",
            as: "product_inventories",
            pipeline: [
              {
                $match: {
                  status: 1,
                  branch: branchObjectId,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            total_inventory: {
              $sum: "$product_inventories.stock",
            },
          },
        },
        {
          $lookup: {
            from: "product_units",
            localField: "unit",
            foreignField: "_id",
            as: "unit",
          },
        },
        {
          $lookup: {
            from: "product_categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "product_brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand",
          },
        },

        // Lookup product_units_details by product + filter by status and branch
        {
          $lookup: {
            from: "product_units_details",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$product", "$$productId"] },
                      { $eq: ["$status", 1] },
                      { $eq: ["$branch", branchObjectId] },
                    ],
                  },
                },
              },
              // Lookup to get unit name (from "name" field in product_units_details)
              {
                $lookup: {
                  from: "product_units",
                  localField: "name",
                  foreignField: "_id",
                  as: "unit_name",
                },
              },
              {
                $addFields: {
                  name: { $arrayElemAt: ["$unit_name", 0] },
                },
              },
              {
                $project: {
                  unit_name: 0,
                },
              },
            ],
            as: "product_units_details",
          },
        },

        // Flatten unit, category, brand
        {
          $addFields: {
            unit: { $arrayElemAt: ["$unit", 0] },
            category: { $arrayElemAt: ["$category", 0] },
            brand: { $arrayElemAt: ["$brand", 0] },
          },
        },
      ])
      .exec();

    // Count total products
    const totalCountResult = await products
      .aggregate([{ $match: productList }, { $count: "total" }])
      .exec();

    const totalCount = totalCountResult[0]?.total || 0;

    success_200(res, "", {
      currentPage: page_number,
      totalPages: Math.ceil(totalCount / page_limit),
      totalCount,
      data: finalProducts,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_log = await products_log?.findById(id);

        if (!selected_product_log) {
          failed_400(res, "Product not found");
        } else {
          success_200(res, "", selected_product_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_products_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { product } = req?.body;

      if (!product) {
        incomplete_400(res);
      } else {
        const all_products_log = await products_log?.find({
          product: product,
        });
        success_200(res, "", all_products_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_unit_detail = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_unit_detail = await product_units_details
          ?.findById(id)
          ?.populate("name");

        if (!selected_product_unit_detail) {
          failed_400(res, "Unit not found");
        } else {
          success_200(res, "", selected_product_unit_detail);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_barcode = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { barcode } = req?.body;

      if (!barcode) {
        incomplete_400(res);
      } else {
        const selected_product = await products?.findOne({
          barcode: barcode,
          branch: authorize?.branch,
        });

        if (!selected_product || selected_product?.status == 2) {
          failed_400(res, "Product not found");
        } else {
          success_200(res, "", selected_product);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_unavailable_products = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      return unauthorized(res);
    }

    const { branch } = req.body;
    if (!branch) {
      return catch_400(res, "Branch is required.");
    }

    const currentBranchId = new mongoose.Types.ObjectId(authorize.branch);
    const targetBranchId = new mongoose.Types.ObjectId(branch);

    // Get all product names available in the current branch
    const currentBranchProducts = await products.aggregate([
      { $match: { branch: currentBranchId, status: { $ne: 2 } } },
      { $project: { name: 1 } },
    ]);

    const currentBranchProductNames = currentBranchProducts.map((p) => p.name);

    // Get all product names available in the target branch
    const targetBranchProducts = await products.aggregate([
      { $match: { branch: targetBranchId, status: { $ne: 2 } } },
      { $project: { name: 1 } },
    ]);

    const targetBranchProductNames = targetBranchProducts.map((p) => p.name);

    // Find products that exist in the current branch but not in the target branch
    const unavailableProductNames = currentBranchProductNames.filter(
      (name) => !targetBranchProductNames.includes(name)
    );

    // Get full details of unavailable products
    const unavailableProducts = await products.aggregate([
      {
        $match: {
          name: { $in: unavailableProductNames },
          branch: currentBranchId,
        },
      },
      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "product_units_details",
          localField: "_id",
          foreignField: "product",
          as: "product_units_details",
          pipeline: [
            {
              $addFields: {
                name: { $toObjectId: "$name" },
              },
            },
            {
              $lookup: {
                from: "product_units",
                localField: "name",
                foreignField: "_id",
                as: "name_details",
              },
            },
            {
              $addFields: {
                name_details: { $arrayElemAt: ["$name_details", 0] },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ]);

    success_200(res, "", unavailableProducts);
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

const download_all_products_reports_csv = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) return unauthorized(res);

    const { search, sort, unit, category, brand, type, branch, status } =
      req.body;

    let selected_branch =
      branch === "ALL"
        ? "ALL"
        : new mongoose.Types.ObjectId(branch || authorize?.branch);

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const productList = {
      ...queryConditions,
      status: { $ne: 2 },
    };

    if (search) productList.name = { $regex: search, $options: "i" };
    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    const inventorySort =
      sort === 1
        ? { name: -1 }
        : sort === 2
        ? { total_inventory: 1 }
        : sort === 3
        ? { total_inventory: -1 }
        : { name: 1 };

    const pipeline = [
      { $match: productList },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "product_inventories",
          pipeline: [
            {
              $match: {
                status: 1,
                stock: { $gt: 0, $ne: null, $ne: Infinity, $ne: undefined },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          total_inventory: {
            $sum: {
              $map: {
                input: "$product_inventories",
                as: "inventory",
                in: {
                  $cond: {
                    if: { $gt: [{ $ifNull: ["$$inventory.stock", 0] }, 0] },
                    then: "$$inventory.stock",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      { $sort: inventorySort },
      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $addFields: { branch: { $arrayElemAt: ["$branch", 0] } } },
      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      {
        $lookup: {
          from: "product_units_details",
          localField: "_id",
          foreignField: "product",
          as: "product_units_details",
        },
      },
      {
        $unwind: {
          path: "$product_units_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "product_units",
          localField: "product_units_details.name",
          foreignField: "_id",
          as: "product_units_detail_unit",
        },
      },
      {
        $addFields: {
          "product_units_details.name": {
            $arrayElemAt: ["$product_units_detail_unit", 0],
          },
        },
      },

      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ];

    const results = await products.aggregate(pipeline).exec();

    // Prepare CSV data
    const csvData = results.map((product) => ({
      id: product._id,
      product_name: product.name,
      barcode: product.barcode,
      unit: product.unit?.name || "",
      category: product.category?.name || "",
      brand: product.brand?.name || "",
      inventory: product.total_inventory || 0,
      stock: product.stock || 0,
      expiry: product.expiry || 0,
      purchase_price: product.purchase_price || 0,
      sale_price: product.sale_price || 0,
      wholesale_price: product.wholesale_price || 0,
      tax: product.tax || 0,
      unit_name: product.product_units_details?.name?.name || "",
      unit_conversion: product.product_units_details?.conversion || "",
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(csvData);

    res.header("Content-Type", "text/csv");
    res.attachment("product_report.csv");
    return res.send(csv);
  } catch (error) {
    catch_400(res, error.message);
  }
};

const import_product_csv = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      failed_400("Import format unvalid");
    } else {
      unauthorized(res);
    }
  } catch (error) {
    catch_400(res, error.message);
  }
};

const create_products_csv = async (req, res) => {
  const auth = authorization(req);
  if (!auth) return unauthorized(res);
  if (!req.file) return incomplete_400(res, "CSV file missing");

  const rows = [];

  fs.createReadStream(req.file.path)
    .pipe(parse({ headers: true, trim: true }))
    .on("error", (err) => catch_400(res, err.message))
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        const tasks = rows.map(async (row) => {
          const {
            product_name,
            barcode,
            unit,
            purchase_price,
            sale_price,
            wholesale_price,
            tax,
            expiry_alert,
            stock_alert,
            status,
            branch,
            unit_name,
            unit_conversion,
          } = row;

          if (!product_name) return;

          const branchId = branch || auth.branch;
          const existingProduct = await products.findOne({
            name: product_name,
            branch: branchId,
            status: { $ne: 2 },
          });

          if (existingProduct) return;

          const newProduct = await products.create({
            name: product_name,
            barcode,
            purchase_price: parseFloat(purchase_price || 0),
            sale_price: parseFloat(sale_price || 0),
            wholesale_price: parseFloat(wholesale_price || 0),
            stock: parseFloat(stock_alert || 0),
            expiry: parseFloat(expiry_alert || 0),
            tax: parseFloat(tax || 0),
            type: 1,
            status: parseInt(status || 1),
            ref: auth.ref,
            branch: branchId,
            created: new Date(),
            created_by: auth.id,
          });

          if (unit_name) {
            const unitDoc = await product_units.findOne({ name: unit_name });
            if (unitDoc) {
              await product_units_details.create({
                product: newProduct._id,
                name: unitDoc._id,
                conversion: unit_conversion,
                status: parseInt(status || 1),
                ref: auth.ref,
                branch: branchId,
                created: new Date(),
                created_by: auth.id,
              });
            }
          }
        });

        await Promise.allSettled(tasks);

        success_200(res, `${rows.length} product items processed`);
      } catch (err) {
        catch_400(res, err.message);
      } finally {
        fs.unlink(
          req.file.path,
          (e) => e && console.error("Temp-file delete failed:", e)
        );
      }
    });
};

// const create_products_csv = async (req, res) => {
//   const auth = authorization(req);
//   if (!auth) return unauthorized(res);
//   if (!req.file) return incomplete_400(res, "CSV file missing");

//   const rows = [];

//   fs.createReadStream(req.file.path)
//     .pipe(parse({ headers: true, trim: true }))
//     .on("error", (err) => catch_400(res, err.message))
//     .on("data", (row) => rows.push(row))
//     .on("end", async () => {
//       try {
//         let allproducts = [];
//         let updatedProducts = [];

//         const tasks = rows.map(async (row) => {
//           const {
//             product_name,
//             barcode,
//             unit,
//             purchase_price,
//             sale_price,
//             wholesale_price,
//             tax,
//             expiry_alert,
//             stock_alert,
//             status,
//             branch,
//             unit_name,
//             unit_conversion,
//           } = row;

//           if (!product_name) return;

//           const branchId = branch || auth.branch;

//           const existingProduct = await products.findOne({
//             name: product_name,
//             branch: branchId,
//             status: { $ne: 2 },
//           });

//           // ✅ If product exists, update VAT to 5%
//           if (existingProduct) {
//             if (existingProduct.tax !== 5) {
//               await products.updateOne(
//                 { _id: existingProduct._id },
//                 { $set: { tax: 5 } }
//               );
//               updatedProducts.push(product_name);
//             }
//             return;
//           }

//           // If product does not exist, collect for potential insertion
//           allproducts.push(product_name);
//         });

//         await Promise.allSettled(tasks);

//         success_200(
//           res,
//           `${rows.length} products processed. ${updatedProducts.length} updated with VAT 5.`,
//           {
//             updated_products: updatedProducts,
//             new_products: allproducts,
//           }
//         );
//       } catch (err) {
//         catch_400(res, err.message);
//       } finally {
//         fs.unlink(
//           req.file.path,
//           (e) => e && console.error("Temp-file delete failed:", e)
//         );
//       }
//     });
// };

module.exports = {
  get_create_product,
  create_product,
  create_bulk_product,
  update_product,
  delete_product,
  get_product,
  get_product_name,
  get_all_products,
  get_product_log,
  get_all_products_log,
  get_product_unit_detail,
  get_product_barcode,
  get_all_unavailable_products,
  download_all_products_reports_csv,
  import_product_csv,
  create_products_csv,
};
