const router = require("express").Router();
const { Product, Category, Tag, ProductTag } = require("../../models");

// The `/api/products` endpoint

// get all products
router.get("/", async (req, res) => {
  try {
    const productData = await Product.findAll({
      include: [{ model: Category }, { model: Tag, as: "product_tags" }],
    });
    res.status(200).json(productData);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get one product
router.get("/:id", async (req, res) => {
  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
  try {
    const productData = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag, as: "product_tags" }],
    });
    if (!productData) {
      res.status(404).json({ message: "No product found with that id!" });
      return;
    }
    res.status(200).json(productData);
  } catch (error) {
    res.status(500).json(error);
  }
});

// create new product
router.post("/", async (req, res) => {
  try {
    // Create the product
    const product = await Product.create(req.body);

    // If there are tagIds in the request body, create the associated ProductTag records
    if (req.body.tagIds && req.body.tagIds.length > 0) {
      const productTags = req.body.tagIds.map((tagId) => {
        return { product_id: product.id, tag_id: tagId };
      });
      const savedTags = await ProductTag.bulkCreate(productTags);
      if (!savedTags) {
        return res
          .status(400)
          .json({ message: "Unable to create product tags." });
      }
    }

    // Fetch the newly created product, including its associated Category and Tag data
    const savedProduct = await Product.findByPk(product.id, {
      include: [{ model: Category }, { model: Tag, as: "product_tags" }],
    });

    // Return the saved product in the response
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create product." });
  }
});

// update product
router.put("/:id", (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete("/:id", async (req, res) => {
  // delete one product by its `id` value
  try {
    const productData = await Product.destroy({
      where: {
        id: req.params.id,
      },
    });
    if (!productData) {
      res.status(404).json({ message: "No product found with that id!" });
      return;
    }
    res.status(200).json({ message: "Product Has been deleted" });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
