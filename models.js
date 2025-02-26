import { DataTypes } from "sequelize";
import sequelize from "./db.js";

// Таблиця продуктів
const Products = sequelize.define('Products', {
  name: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.TEXT, allowNull: false },
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

// Таблиця звітів
const Reports = sequelize.define("Reports", {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  planned_quantity: { type: DataTypes.INTEGER, allowNull: false },
  actual_quantity: { type: DataTypes.INTEGER, allowNull: false },
});

// Встановлення зв'язків між таблицями
Products.hasMany(DailyPlans, { foreignKey: "product_id" });
Products.hasMany(ActualStocks, { foreignKey: "product_id" });
Products.hasMany(Reports, { foreignKey: "product_id" });

DailyPlans.belongsTo(Products, { foreignKey: "product_id" });
ActualStocks.belongsTo(Products, { foreignKey: "product_id" });
Reports.belongsTo(Products, { foreignKey: "product_id" });

// Синхронізація моделей з базою даних (створення таблиць)
sequelize.sync();

export { Products, DailyPlans, ActualStocks, Reports };