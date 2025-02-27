import express from "express";
import soap from "soap";
import {
  Categories,
  Products,
  DailyPlans,
  ActualStocks,
} from "./models.js";
import { readFileSync } from "fs";

const app = express();
const xml = readFileSync("./inventory.wsdl", "utf8");

// Створення SOAP сервісу
const service = {
  // Ім'я сервісу
  InventoryService: {
    // Ім'я порту
    InventoryPort: {
      // Метод для додавання товару
      async addProduct(args, callback) {
        try {
          const { name, category } = args;
          let categoryInstance = await Categories.findOne({
            where: { name: category },
          });
          if (!categoryInstance) {
            categoryInstance = await Categories.create({ name: category });
          }
          const product = await Products.create({
            name,
            category_id: categoryInstance.id,
          });
          callback(null, {
            productId: product.id,
            message: "Товар успішно додано",
          });
        } catch (error) {
          callback(error);
        }
      },


      // Метод для додавання плану на день
      async addDailyPlan(args, callback) {
        try {
          const { productName, category, plannedQuantity } = args;
          let categoryInstance = await Categories.findOne({
            where: { name: category },
          });
          if (!categoryInstance) {
            categoryInstance = await Categories.create({ name: category });
          }
          let product = await Products.findOne({
            where: { name: productName, category_id: categoryInstance.id },
          });
          if (!product) {
            product = await Products.create({
              name: productName,
              category_id: categoryInstance.id,
            });
          }
          const date = new Date().toISOString().split("T")[0];
          let dailyPlan = await DailyPlans.findOne({
            where: { product_id: product.id, date },
          });
          if (dailyPlan) {
            dailyPlan.planned_quantity += plannedQuantity;
            await dailyPlan.save();
          } else {
            dailyPlan = await DailyPlans.create({
              product_id: product.id,
              planned_quantity: plannedQuantity,
              date,
            });
          }
          callback(null, {
            dailyPlanId: dailyPlan.id,
            message: "План на день успішно оновлено",
          });
        } catch (error) {
          callback(error);
        }
      },

      // Метод для додавання фактичного залишку
      async addActualStock(args, callback) {
        try {
          const { productName, actualQuantity } = args;
          const product = await Products.findOne({
            where: { name: productName },
          });
          const plan_id = await DailyPlans.findOne({
            where: { product_id: product.id },
          });
          if (!product) return callback(new Error("Товар не знайдено"));
          const date = new Date().toISOString().split("T")[0];
          await ActualStocks.create({
            product_id: product.id,
            actual_quantity: actualQuantity,
            plan_id: plan_id.id,
            date,
          });
          callback(null, {
            success: true,
            message: "Фактичний залишок успішно додано",
          });
        } catch (error) {
          callback(error);
        }
      },

      // Метод для отримання плану на день
      async getDailyPlan(args, callback) {
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
           callback("План на день не знайдено");
          } else {
            callback(null, {
              dailyPlans: result,
              message: "План на день успішно отримано",
            });
          }
        } catch (error) {
          callback(error);
        }
      },

      // Метод для отримання звіту
      async getReport(args, callback) {
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
                difference:
                  plan.planned_quantity -
                  (actualStock ? actualStock.actual_quantity : 0),
              };
            })
          );
          callback(null, { reports, message: "Звіт успішно сформовано" });
        } catch (error) {
          callback(error);
        }
      },

      // Метод для видалення всіх планів на день
      async deleteDailyPlans(args, callback) {
        try {
          const date = new Date().toISOString().split("T")[0];

          const result = await DailyPlans.destroy({ where: { date } });
          if (result === 0) {
            callback(new Error("Плани на день не знайдено"));
          } else {
            callback(null, {
              success: true,
              message: "Плани на день успішно видалено",
            });
          }
        } catch (error) {
          callback(error);
        }
      },
    },
  },
};

app.use("/wsdl", (req, res) => {
  res.type("text/xml");
  res.send(xml);
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  soap.listen(server, "/inventory", service, xml);
  console.log("SOAP server running on port", PORT);
});
