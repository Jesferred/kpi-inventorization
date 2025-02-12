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
                    callback(null, { productId: product.id });
                } catch (error) {
                    callback(error);
                }
            },
            
            async addDailyPlan(args, callback) {
                const { productId, plannedQuantity, date } = args;
                await DailyPlans.create({ product_id: productId, planned_quantity: plannedQuantity, date });
                callback(null, { success: true });
            },

            async updateStock(args, callback) {
                try {
                    const { productId, changeType, quantity } = args;
                    await StockChanges.create({ product_id: productId, change_type: changeType, quantity });
                    callback(null, { success: true });
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

                callback(null, { reports });
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