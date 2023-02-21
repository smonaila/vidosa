using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace vidosa.Areas.finance.Models
{
    public class PayFastSettings
    {
        public PayFastSettings()
        {
        }
        #region Constructors
        public PayFastSettings(string passPhrase)
        {
            PassPhrase = passPhrase;
        }
        #endregion

        #region Properties
        public string MerchantId { get; set; }
        public string MerchantKey { get; set; }
        public string PassPhrase { get; set; }
        public string ProcessUrl { get; set; }
        public string ValidationUrl { get; set; }
        public string ReturnUrl { get; set; }
        public string CancelUrl { get; set; }
        public string NotifyUrl { get; set; }
        public string BillingDate { get; set; }
        public decimal RecurringAmount { get; set; }
        

        // Buyer Details Properties
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string EmailAddress { get; set; }
        public string CellNumber { get; set; }

        // Transaction Details
        public decimal Amount { get; set; }
        public string ItemName { get; set; }
        public string ItemDescription { get; set; }
        public bool EmailConfirmation { get; set; }
        public string ConfirmationAddress { get; set; }

        public SubscriptionType Subscription_Type { get; set; }
        public SubscriptionFrequency subscriptionFrequency { get; set; }
        public int Cycles { get; set; }
        #endregion

        #region Security Properties
        public string Signature { get; set; }
        #endregion

        #region Enumerators
        public enum SubscriptionType
        {
            Subscription = 1,
            AdHoc = 2
        }

        public enum SubscriptionFrequency
        {
            Monthly = 3,
            Quarteley = 4,
            Biannual = 5,
            Annual = 6
        }
        #endregion

        #region Methods
        public bool IsIpAddressInList(string[] validSites, string requestIp)
        {
            ArrayList validIps = new ArrayList();
            for (int i = 0; i < validSites.Length; i++)
            {
                validIps.AddRange(Dns.GetHostAddresses(validSites[i]));
            }
            IPAddress ipAddress = IPAddress.Parse(requestIp);
            if (validIps.Contains(ipAddress))
            {
                return true;
            }
            else
            {
                return false;
            }
        }

        // Perform Security Checks
        public void SecurityChecks(NameValueCollection postedVariablesCollection, string merchant_Id, string requestIp)
        {
            // get all the valid websites for payfast
            string[] validSites = new string[] { "www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za", "localhost" };
            
            if (string.IsNullOrEmpty(requestIp))
            {
                throw new Exception("Requesting IP Cannot be empty");
            }

            // check the request address if its in the list of valid addresses
            if (!this.IsIpAddressInList(validSites, requestIp))
            {
                throw new Exception("This is the wrong IP Address!");
            }
        }

        // Hash using the MD5
        public string Encrypt(string input)
        {
            string output = string.Empty;
            MD5 md5 = new MD5CryptoServiceProvider();
            
            // compute hash from the bytes of text
            md5.ComputeHash(ASCIIEncoding.ASCII.GetBytes(string.Format("{0}&passphrase={1}", input, 
                ConfigurationManager.AppSettings["pass_phrase"])));

            // get hash result after compute it
            byte[] result = md5.Hash;

            StringBuilder strBuilder = new StringBuilder();
            for (int i = 0; i < result.Length; i++)
            {
                // change it into 2 hexadecimal digits
                // for each byte
                strBuilder.Append(result[i].ToString("x2"));
            }
            output = strBuilder.ToString();
            return output;
        }

        // Compare Signatures
        public bool CompareSig(string input, string recsignature)
        {
            string signature = Encrypt(input);
            if (!(signature.Equals(recsignature)))
            {
                return false;
            }
            return true;
        }

        // Validate Data
        public void ValidateData(string site, NameValueCollection postedVariables)
        {
            WebClient webClient = null;
            try
            {
                webClient = new WebClient();
                byte[] responseArray = webClient.UploadValues(site, postedVariables);

                // get the response and remove the 
                string results = Encoding.ASCII.GetString(responseArray);
                results = results.Replace("\r\n", " ").Replace("\r", "").Replace("\n", " ");

                // check if the data was valid
                if (results == null || !results.StartsWith("VALID"))
                {
                    throw new Exception("Data was invalid");
                }
            }
            catch (Exception ex)
            {
                throw;
            }
            finally
            {
                if (webClient != null)
                {
                    webClient.Dispose();
                }
            }
        }
        #endregion
    };

}