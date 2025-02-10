const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  failed_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const branches = require("../Models/branches");
const branches_log = require("../Models/branches_log");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { environment } = require("../Global/environment");

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

    const dir = path.join(UPLOAD, "branches", "branches");
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
        .join("/branches/branches", path.basename(req.file.path))
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

const create_branch = async (req, res) => {
  try {
    upload(req, res, async (errors) => {
      if (errors) {
        failed_400(res, errors?.message);
      } else {
        let authorize = authorization(req);

        if (authorize) {
          const {
            name,
            phone,
            email,
            tax,
            street,
            area,
            city,
            state,
            country,
            status,
          } = req?.body;

          if (!name || !phone || !email || !country) {
            incomplete_400(res);
          } else {
            const selected_branch_name = await branches?.findOne({
              name: name,
              ref: authorize?.ref,
            });

            if (selected_branch_name) {
              remove_file(add_file(req), res);
              failed_400(res, "Branch name exists");
            } else {
              const branch = new branches({
                image: add_file(req, res),
                name: name,
                phone: phone,
                email: email,
                tax: tax,
                street: street,
                area: area,
                city: city,
                state: state,
                country: country,
                status: 0,
                ref: authorize?.ref,
                created: new Date(),
                created_by: authorize?.id,
              });

              const branch_save = await branch?.save();
              success_200(res, "Branch created");
            }
          }
        } else {
          unauthorized(res);
        }
      }
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_branch = async (req, res) => {
  try {
    upload(req, res, async (errors) => {
      if (errors) {
        failed_400(res, errors?.message);
      } else {
        let authorize = authorization(req);

        if (authorize) {
          const {
            id,
            name,
            phone,
            email,
            tax,
            street,
            area,
            city,
            state,
            country,
            status,
          } = req?.body;

          if (!id || !name || !phone || !email || !country) {
            remove_file(add_file(req), res);
            incomplete_400(res);
          } else {
            const selected_branch = await branches?.findById(id);

            if (!selected_branch || selected_branch.status == 2) {
              remove_file(add_file(req), res);
              failed_400(res, "Branch not found");
            } else {
              const selected_branch_name = await branches?.findOne({
                _id: { $ne: id },
                name: name,
                ref: authorize?.ref,
              });

              if (selected_branch_name) {
                remove_file(add_file(req), res);
                failed_400(res, "Branch name exists");
              } else {
                const branch_log = new branches_log({
                  branch: selected_branch?._id,
                  image: selected_branch?.image,
                  name: selected_branch?.name,
                  phone: selected_branch?.phone,
                  email: selected_branch?.email,
                  tax: selected_branch?.tax,
                  street: selected_branch?.street,
                  area: selected_branch?.area,
                  city: selected_branch?.city,
                  state: selected_branch?.state,
                  country: selected_branch?.country,
                  status: selected_branch?.status,
                  ref: selected_branch?.ref,
                  updated: new Date(),
                  updated_by: authorize?.id,
                });
                const branch_log_save = await branch_log?.save();

                if (!req?.file && selected_branch.image) {
                  remove_file(selected_branch?.image, res);
                  selected_branch.image = "";
                } else if (req?.file && !selected_branch.image) {
                  selected_branch.image = add_file(req, res);
                } else if (req?.file && selected_branch.image) {
                  remove_file(selected_branch?.image, res);
                  selected_branch.image = add_file(req, res);
                } else {
                  selected_branch.image = "";
                }

                selected_branch.name = name;
                selected_branch.phone = phone;
                selected_branch.email = email;
                selected_branch.tax = tax;
                selected_branch.street = street;
                selected_branch.area = area;
                selected_branch.city = city;
                selected_branch.state = state;
                selected_branch.country = country;
                selected_branch.status = status ? status : 0;

                const branch_update = await selected_branch?.save();
                success_200(res, "Branch updated");
              }
            }
          }
        } else {
          unauthorized(res);
        }
      }
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_branch = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_branch = await branches?.findById(id);

        if (!selected_branch) {
          failed_400(res, "Branch not found");
        } else {
          const branch_log = new branches_log({
            branch: selected_branch?._id,
            image: selected_branch?.image,
            name: selected_branch?.name,
            phone: selected_branch?.phone,
            email: selected_branch?.email,
            tax: selected_branch?.tax,
            street: selected_branch?.street,
            area: selected_branch?.area,
            city: selected_branch?.city,
            state: selected_branch?.state,
            country: selected_branch?.country,
            status: selected_branch?.status,
            ref: selected_branch?.ref,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const branch_log_save = await branch_log?.save();

          selected_branch.status = 2;

          const branch_delete = await selected_branch?.save();
          success_200(res, "Branch deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_branch = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (authorize) {
      let { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_branch = await branches?.findById(id);

        if (!selected_branch) {
          failed_400(res, "Branch not found");
        } else {
          success_200(res, "", selected_branch);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_branches = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const branchList = { ref: authorize?.ref };

    if (search) {
      branchList.name = { $regex: search, $options: "i" };
    }

    // Set sorting options
    let sortOption = { created: -1 }; // Default sorting
    if (sort == 0) {
      sortOption = { name: 1 }; // Sort by name ascending
    } else if (sort == 1) {
      sortOption = { name: -1 }; // Sort by name descending
    }

    // Get total count for pagination metadata
    const totalCount = await branches.countDocuments(branchList);

    // Fetch paginated data
    const paginated_branches = await branches
      .find(branchList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_branches,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

// const get_all_branches = async (req, res) => {
//   try {
//     let authorize = authorization(req);

//     if (authorize) {
//       const all_branches = await branches?.find({ ref: authorize?.ref });
//       success_200(res, "", all_branches);
//     } else {
//       unauthorized(res);
//     }
//   } catch (errors) {
//     catch_400(res, errors?.message);
//   }
// };

const get_branch_log = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (authorize) {
      let { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const branch_log = await branches_log?.findById(id);

        if (!branch_log) {
          failed_400(res, "Branch log not found");
        } else {
          success_200(res, "", branch_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_branches_log = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (authorize) {
      const { branch } = req?.params;

      if (!branch) {
        incomplete_400(res);
      } else {
        const all_branches_log = await branches_log?.find({ branch: branch });
        success_200(res, "", all_branches_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_branch,
  update_branch,
  delete_branch,
  get_branch,
  get_all_branches,
  get_branch_log,
  get_all_branches_log,
};
