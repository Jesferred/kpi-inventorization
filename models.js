import { DataTypes } from "sequelize";
import sequelize from "./db.js";

// Таблиця категорій продуктів
const Categories = sequelize.define("Categories", {
  name: { type: DataTypes.TEXT, allowNull: false, unique: true },
});

// Таблиця продуктів
const Products = sequelize.define("Products", {
  name: { type: DataTypes.TEXT, allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: false }, // Додаємо колонку category_id
});

// Таблиця планів на день
const DailyPlans = sequelize.define("DailyPlans", {
  planned_quantity: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
});

// Таблиця фактичних залишків
const ActualStocks = sequelize.define("ActualStocks", {
  actual_quantity: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
});

// Встановлення зв'язків між таблицями
Categories.hasMany(Products, { foreignKey: "category_id" });
Products.belongsTo(Categories, { foreignKey: "category_id" });

Products.hasMany(DailyPlans, { foreignKey: "product_id" });
Products.hasMany(ActualStocks, { foreignKey: "product_id" });

DailyPlans.belongsTo(Products, { foreignKey: "product_id" });
ActualStocks.belongsTo(Products, { foreignKey: "product_id" });

// Додаємо зв’язок між планами та фактичними залишками
DailyPlans.hasOne(ActualStocks, { foreignKey: "plan_id" });
ActualStocks.belongsTo(DailyPlans, { foreignKey: "plan_id" });

// Синхронізація моделей з базою даних
sequelize.sync();

export { Categories, Products, DailyPlans, ActualStocks };
