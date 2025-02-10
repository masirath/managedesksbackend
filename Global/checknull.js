const checknull = (value) => {
  let data = "";

  if (value === "null") {
    data = null;
  } else if (value === "undefined") {
    data = null;
  } else {
    data = value;
  }

  return data;
};

module.exports = { checknull };
