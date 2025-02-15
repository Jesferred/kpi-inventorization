import express from 'express';
import soap from 'soap';
import { Products, DailyPlans, StockChanges, ActualStock, Reports } from './models.js';
import { readFileSync } from 'fs';

const app = express();
const xml = readFileSync('./inventory.wsdl', 'utf8');

const service = {
    InventoryService: {
        InventoryPort: {
            async addProduct(args, callback) {
                try {
                    const { name, category } = args;
                    const product = await Products.create({ name, category });
                    callback(null, { productId: product.id, message: 'Product added successfully' });
                } catch (error) {
                    callback(error);
                }
            },
            
            async addDailyPlan(args, callback) {
                try {
                    const { productName, category, plannedQuantity } = args;
                    // Знайдіть товар за назвою
                    let product = await Products.findOne({ where: { name: productName } });
                    if (!product) {
                        // Якщо товар не знайдено, створіть новий товар
                        product = await Products.create({ name: productName, category });
                    }
                    const productId = product.id;

                    // Отримайте поточну дату
                    const date = new Date().toISOString().split('T')[0];

                    // Перевірка наявності денного плану
                    let dailyPlan = await DailyPlans.findOne({ where: { product_id: productId, date } });
                    if (dailyPlan) {
                        // Якщо план існує, оновіть кількість
                        dailyPlan.planned_quantity += plannedQuantity;
                        await dailyPlan.save();
                        callback(null, { dailyPlanId: dailyPlan.id, message: 'Daily plan updated successfully' });
                    } else {
                        // Якщо план не існує, створіть новий план
                        dailyPlan = await DailyPlans.create({ product_id: productId, planned_quantity: plannedQuantity, date });
                        callback(null, { dailyPlanId: dailyPlan.id, message: 'Daily plan created successfully' });
                    }
                } catch (error) {
                    callback(error);
                }
            },

            async updateStock(args, callback) {
                try {
                    const { productName, actualQuantity } = args;
                    // Знайдіть товар за назвою
                    let product = await Products.findOne({ where: { name: productName } });
                    if (!product) {
                        callback(new Error('Product not found'));
                        return;
                    }
                    const productId = product.id;

                    // Отримайте поточну дату
                    const date = new Date().toISOString().split('T')[0];

                    // Збережіть фактичну кількість товарів
                    await ActualStock.create({ product_id: productId, actual_quantity: actualQuantity, date });
                    callback(null, { success: true, message: 'Actual stock updated successfully' });
                } catch (error) {
                    callback(error);
                }
            },

            async getAllProducts(args, callback) {
                try {
                    const products = await Products.findAll();
                    callback(null, { products, message: 'Products retrieved successfully' });
                } catch (error) {
                    callback(error);
                }
            },

            async getReport(args, callback) {
                const { date } = args;
                const plans = await DailyPlans.findAll({ where: { date } });
                const reports = [];

                for (const plan of plans) {
                    const actualStock = await ActualStock.findOne({ where: { product_id: plan.product_id, date } });
                    const actualQuantity = actualStock ? actualStock.actual_quantity : 0;
                    reports.push({
                        productId: plan.product_id,
                        plannedQuantity: plan.planned_quantity,
                        actualQuantity: actualQuantity,
                        difference: plan.planned_quantity - actualQuantity
                    });
                }

                callback(null, { reports, message: 'Report generated successfully' });
            }
        }
    }
};

app.use('/wsdl', (req, res) => {
    res.type('text/xml');
    res.send(xml);
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    soap.listen(server, '/inventory', service, xml);
    console.log('SOAP server running on port', PORT);
});