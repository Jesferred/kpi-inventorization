import express from "express";
import soap from "soap";
import { Products, DailyPlans, ActualStocks, Reports } from "./models.js";
import { readFileSync } from "fs";

const app = express();
const xml = readFileSync("./inventory.wsdl", "utf8");

// Створення SOAP сервісу
const service = {
    // Опис сервісу
  InventoryService: {
    // Порт для інвентаризації
    InventoryPort: {
     // Метод для додавання продукту
      async addProduct(args, callback) {
        try {
          const { name, category } = args;
          const product = await Products.create({ name, category });
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
          let product = await Products.findOne({
            where: { name: productName },
          });
          if (!product) {
            product = await Products.create({ name: productName, category });
          }
          const productId = product.id;

          const date = new Date().toISOString().split("T")[0];

          let dailyPlan = await DailyPlans.findOne({
            where: { product_id: productId, date },
          });
          if (dailyPlan) {
            dailyPlan.planned_quantity += plannedQuantity;
            await dailyPlan.save();
            callback(null, {
              dailyPlanId: dailyPlan.id,
              message: "План на день успішно оновлено",
            });
          } else {
            dailyPlan = await DailyPlans.create({
              product_id: productId,
              planned_quantity: plannedQuantity,
              date,
            });
            callback(null, {
              dailyPlanId: dailyPlan.id,
              message: "План на день успішно додано",
            });
          }
        } catch (error) {
          callback(error);
        }
      },

      // Метод для додавання фактичного залишку
      async addActualStock(args, callback) {
        try {
          const { productName, actualQuantity } = args;
          let product = await Products.findOne({
            where: { name: productName },
          });
          if (!product) {
            callback(new Error("Товар не знайдено"));
            return;
          }
          const productId = product.id;

          const date = new Date().toISOString().split("T")[0];

          await ActualStocks.create({
            product_id: productId,
            actual_quantity: actualQuantity,
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

        // Метод для отримання всіх продуктів
      async getAllProducts(args, callback) {
        try {
          const products = await Products.findAll();
          callback(null, {
            products,
            message: "Продукти успішно отримано",
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
            include: [{ model: Products, attributes: ["name", "category"] }],
          });

          const result = dailyPlans.map((plan) => ({
            productName: plan.Product.name,
            category: plan.Product.category,
            plannedQuantity: plan.planned_quantity,
            date: plan.date,
          }));

          callback(null, {
            dailyPlans: result,
            message: "План на день успішно отримано",
          });
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
            include: [{ model: Products, attributes: ["name", "category"] }],
          });

          const reports = await Promise.all(
            plans.map(async (plan) => {
              const actualStock = await ActualStocks.findOne({
                where: { product_id: plan.product_id, date },
              });
              const actualQuantity = actualStock
                ? actualStock.actual_quantity
                : 0;
              const difference = plan.planned_quantity - actualQuantity;
              const report = {
                productName: plan.Product.name,
                category: plan.Product.category,
                plannedQuantity: plan.planned_quantity,
                actualQuantity: actualQuantity,
                difference: difference,
              };

              await Reports.create({
                product_id: plan.product_id,
                planned_quantity: report.plannedQuantity,
                actual_quantity: report.actualQuantity,
                date: date,
              });

              return report;
            })
          );

          callback(null, {
            reports,
            message: "Звіт успішно сформовано",
          });
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
              message:
                "Плани на день успішно видалено",
            });
          }
        } catch (error) {
          callback(error);
        }
      },
    },
  },
};

// Маршрут для відображення WSDL документа
app.use("/wsdl", (req, res) => {
  res.type("text/xml");
  res.send(xml);
});

const PORT = process.env.PORT || 3000;

// Запуск сервера
const server = app.listen(PORT, () => {
  soap.listen(server, "/inventory", service, xml);
  console.log("SOAP server running on port", PORT);
});
