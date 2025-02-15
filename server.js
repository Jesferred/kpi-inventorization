import express from 'express';
import soap from 'soap';
import { Products, DailyPlans, StockChanges, Reports } from './models.js';
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
                        // Якщо план існує, поверніть його ID
                        callback(null, { dailyPlanId: dailyPlan.id, message: 'Daily plan already exists' });
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
                    const { productId, changeType, quantity } = args;
                    await StockChanges.create({ product_id: productId, change_type: changeType, quantity });
                    callback(null, { success: true, message: 'Stock updated successfully' });
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
                    const changes = await StockChanges.findAll({ where: { product_id: plan.product_id } });
                    const totalChange = changes.reduce((sum, change) => sum + change.quantity, 0);
                    reports.push({
                        productId: plan.product_id,
                        plannedQuantity: plan.planned_quantity,
                        actualQuantity: plan.planned_quantity - totalChange,
                        difference: totalChange
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