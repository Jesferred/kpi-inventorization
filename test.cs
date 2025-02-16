using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Xml.Linq;

namespace Lab1._1
{
    public partial class Page_Inventory : Window
    {
        public Page_Inventory()
        {
            InitializeComponent();
        }

        private void ProductBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (ProductBox.Text == "Назва продукту")
            {
                ProductBox.Text = "";
            }
        }

        private void ProductBox_LostFocus(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(ProductBox.Text))
            {
                ProductBox.Text = "Назва продукту";
            }
        }

        private void AmountBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (AmountBox.Text == "Введіть кількість")
            {
                AmountBox.Text = "";
            }
        }

        private void AmountBox_LostFocus(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(AmountBox.Text))
            {
                AmountBox.Text = "Введіть кількість";
            }
        }

        static string GenerateSoapXml(string productName, int actualQuantity)
        {
            XNamespace soapenv = "http://schemas.xmlsoap.org/soap/envelope/";
            XNamespace tns = "http://example.com/inventory";

            XElement soapEnvelope = new XElement(soapenv + "Envelope",
                new XAttribute(XNamespace.Xmlns + "soapenv", soapenv.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "tns", tns.NamespaceName),
                new XElement(soapenv + "Header"),
                new XElement(soapenv + "Body",
                    new XElement(tns + "UpdateStockRequest",
                        new XElement(tns + "productName", productName),
                        new XElement(tns + "actualQuantity", actualQuantity)
                    )
                )
            );

            return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + soapEnvelope.ToString();
        }

        static async Task<string> SendSoapRequest(string url, string xmlData, string action)
        {
            using (HttpClient client = new HttpClient())
            {
                var content = new StringContent(xmlData, Encoding.UTF8, "text/xml");
                content.Headers.Add("SOAPAction", "http://example.com/inventory/"+action);
                content.Headers.ContentType.CharSet = "utf-8";

                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = content
                };
                request.Headers.Add("Accept", "text/xml");

                Console.WriteLine("SOAP Request Sent:");
                Console.WriteLine(xmlData);

                HttpResponseMessage response = await client.SendAsync(request);
                string responseString = await response.Content.ReadAsStringAsync();

                Console.WriteLine("SOAP Response Received:");
                Console.WriteLine(responseString);

                return responseString;
            }
        }

        private async void btnToInventory_Click(object sender, RoutedEventArgs e)
        {
            string productName = ProductBox.Text;
            string amountText = AmountBox.Text;

            if (string.IsNullOrEmpty(productName) || productName == "Назва продукту")
            {
                ProductBox.Text = "Введіть назву продукту";
                return;
            }

            if (string.IsNullOrEmpty(amountText) || amountText == "Введіть кількість")
            {
                AmountBox.Text = "Введіть кількість.";
                return;
            }

            if (!int.TryParse(amountText, out int amount))
            {
                MessageBox.Show("Кількість має бути цілим числом.");
                return;
            }


            string xmlRequest = GenerateSoapXml(productName, amount);
            string response = await SendSoapRequest("https://invent-13fd83ab7b72.herokuapp.com/inventory", xmlRequest, "updateStock");
            Trace.WriteLine(response);
        }

        private async void btnPlan_Click(object sender, RoutedEventArgs e)
        {
            string xmlRequest = GenerateGetDailyPlanSoapXml();
            string response = await SendSoapRequest("https://invent-13fd83ab7b72.herokuapp.com/inventory", xmlRequest, "getDailyPlan");
            Trace.WriteLine(response);
            DisplayDailyPlan(response);
        }

        static string GenerateGetDailyPlanSoapXml()
        {
            XNamespace soapenv = "http://schemas.xmlsoap.org/soap/envelope/";
            XNamespace tns = "http://example.com/inventory";

            XElement soapEnvelope = new XElement(soapenv + "Envelope",
                new XAttribute(XNamespace.Xmlns + "soapenv", soapenv.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "tns", tns.NamespaceName),
                new XElement(soapenv + "Header"),
                new XElement(soapenv + "Body",
                    new XElement(tns + "GetDailyPlanRequest")
                )
            );

            return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + soapEnvelope.ToString();
        }

        private void DisplayDailyPlan(string response)
        {

            XDocument doc = XDocument.Parse(response);
            XNamespace tns = "http://example.com/inventory";

            var dailyPlans = doc.Descendants(tns + "dailyPlans").Select(plan => new
            {
                ProductName = plan.Element(tns + "productName")?.Value,
                Category = plan.Element(tns + "category")?.Value,
                PlannedQuantity = plan.Element(tns + "plannedQuantity")?.Value,
                Date = plan.Element(tns + "date")?.Value
            });

            StringBuilder sb = new StringBuilder();
            foreach (var plan in dailyPlans)
            {
                sb.AppendLine($"Product Name: {plan.ProductName}");
                sb.AppendLine($"Category: {plan.Category}");
                sb.AppendLine($"Planned Quantity: {plan.PlannedQuantity}");
                sb.AppendLine($"Date: {plan.Date}");
                sb.AppendLine();
            }
            Console.WriteLine( sb.ToString() );
            MessageBox.Show(sb.ToString(), "Daily Plan");
        }

        private void btnToCheck_Click(object sender, RoutedEventArgs e)
        {
            // Implement the logic for btnToCheck_Click
        }

    }
}
