import express from "express";
import { Categories, Products, DailyPlans, ActualStocks, Reports } from "./models.js";

const app = express();
app.use(express.json());

// Додавання продукту
app.post("/products", async (req, res) => {
  try {
    const { name, category } = req.body;
    let categoryInstance = await Categories.findOne({ where: { name: category } });
    if (!categoryInstance) {
      categoryInstance = await Categories.create({ name: category });
    }
    const product = await Products.create({ name, category_id: categoryInstance.id });
    res.status(201).json({ productId: product.id, message: "Товар успішно додано" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Додавання плану на день
app.post("/daily-plans", async (req, res) => {
  try {
    const { productName, category, plannedQuantity } = req.body;
    let categoryInstance = await Categories.findOne({ where: { name: category } });
    if (!categoryInstance) {
      categoryInstance = await Categories.create({ name: category });
    }
    let product = await Products.findOne({ where: { name: productName, category_id: categoryInstance.id } });
    if (!product) {
      product = await Products.create({ name: productName, category_id: categoryInstance.id });
    }
    const productId = product.id;
    const date = new Date().toISOString().split("T")[0];

    let dailyPlan = await DailyPlans.findOne({ where: { product_id: productId, date } });
    if (dailyPlan) {
      dailyPlan.planned_quantity += plannedQuantity;
      await dailyPlan.save();
      res.json({ dailyPlanId: dailyPlan.id, message: "План на день успішно оновлено" });
    } else {
      dailyPlan = await DailyPlans.create({ product_id: productId, planned_quantity: plannedQuantity, date });
      res.status(201).json({ dailyPlanId: dailyPlan.id, message: "План на день успішно додано" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Додавання фактичного залишку
app.post("/actual-stocks", async (req, res) => {
  try {
    const { productName, actualQuantity } = req.body;
    const product = await Products.findOne({ where: { name: productName } });
    if (!product) {
      return res.status(404).json({ error: "Товар не знайдено" });
    }
    const plan = await DailyPlans.findOne({ where: { product_id: product.id } });
    const date = new Date().toISOString().split("T")[0];
    await ActualStocks.create({
      product_id: product.id,
      actual_quantity: actualQuantity,
      plan_id: plan.id,
      date,
    });
    res.status(201).json({ success: true, message: "Фактичний залишок успішно додано" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримання всіх продуктів
app.get("/products", async (req, res) => {
  try {
    const products = await Products.findAll();
    res.json({ products, message: "Продукти успішно отримано" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримання плану на день
app.get("/daily-plans", async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const dailyPlans = await DailyPlans.findAll({
      where: { date },
      include: [{ model: Products, include: [Categories] }],
    });
    const result = dailyPlans.map((plan) => ({
      productName: plan.Product.name,
      category: plan.Product.Category.name,
      plannedQuantity: plan.planned_quantity,
      date: plan.date,
    }));
    if (result.length === 0) {
      res.status(404).json({ error: "План на день не знайдено" });
    } else {
      res.json({ dailyPlans: result, message: "План на день успішно отримано" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримання звіту
app.get("/reports", async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const plans = await DailyPlans.findAll({
      where: { date },
      include: [{ model: Products, include: [Categories] }],
    });
    const reports = await Promise.all(
      plans.map(async (plan) => {
        const actualStock = await ActualStocks.findOne({
          where: { plan_id: plan.id },
        });
        return {
          productName: plan.Product.name,
          category: plan.Product.Category.name,
          plannedQuantity: plan.planned_quantity,
          actualQuantity: actualStock ? actualStock.actual_quantity : 0,
          difference: plan.planned_quantity - (actualStock ? actualStock.actual_quantity : 0),
        };
      })
    );
    res.json({ reports, message: "Звіт успішно сформовано" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "REST API server is running :)" });
});

// Видалення всіх планів на день
app.delete("/daily-plans", async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const result = await DailyPlans.destroy({ where: { date } });
    if (result === 0) {
      res.status(404).json({ error: "Плани на день не знайдено" });
    } else {
      res.json({ success: true, message: "Плани на день успішно видалено" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`REST API server running on port ${PORT}`);
});
