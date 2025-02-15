import { DataTypes } from "sequelize";
import sequelize from "./db.js";

const Products = sequelize.define('Products', {
  name: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.TEXT, allowNull: false },
});

const DailyPlans = sequelize.define("DailyPlans", {
  planned_quantity: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
});

const StockChanges = sequelize.define("StockChanges", {
  change_type: { type: DataTypes.TEXT, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
});

const ActualStock = sequelize.define("ActualStock", {
  actual_quantity: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
});

const Reports = sequelize.define("Reports", {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  planned_quantity: { type: DataTypes.INTEGER, allowNull: false },
  actual_quantity: { type: DataTypes.INTEGER, allowNull: false },
  difference: { type: DataTypes.INTEGER, allowNull: false }
});

Products.hasMany(DailyPlans, { foreignKey: "product_id" });
Products.hasMany(StockChanges, { foreignKey: "product_id" });
Products.hasMany(ActualStock, { foreignKey: "product_id" });
Products.hasMany(Reports, { foreignKey: "product_id" });

DailyPlans.belongsTo(Products, { foreignKey: "product_id" });
StockChanges.belongsTo(Products, { foreignKey: "product_id" });
ActualStock.belongsTo(Products, { foreignKey: "product_id" });
Reports.belongsTo(Products, { foreignKey: "product_id" });

sequelize.sync();

export { Products, DailyPlans, StockChanges, ActualStock, Reports };