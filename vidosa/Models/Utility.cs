using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Xml.Linq;
using vidosa.Controllers;

namespace vidosa.Models
{
    public class Utility
    {
        // A collection of possible bots to visit the www.vidosa.co.za
        private static List<string> bots = new List<string>()
        {
            "googlebot", "bingbot", "msnbot"
        };

        // Is this crawl a bot
        public static bool IsCrawlbot(HttpRequestBase httpRequestBase)
        {
            string userAgent = httpRequestBase.UserAgent.ToLower();
            bool exists = bots.Exists(b => userAgent.Contains(b));
            return exists;
        }

        // Return a botName with the specified userAgent string.
        public static string GetBotName(string UserAgent)
        {
            string botName = bots.Find(bn => UserAgent.ToLower().Contains(bn));
            return bots.Find(bn => UserAgent.ToLower().Contains(bn));
        }

        // Hash using the MD5
        public static string Encrypt(string input)
        {
            string output = string.Empty;
            MD5 md5 = new MD5CryptoServiceProvider();

            // compute hash from the bytes of text
            md5.ComputeHash(ASCIIEncoding.ASCII.GetBytes(string.Format("{0}", input)));

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

        internal static string GetVideoUrlId()
        {
            return Guid.NewGuid().ToString().Replace("-", "");
        }

        internal static void UpdateMpd(Video video)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    HttpServerUtility httpServerUtility = HttpContext.Current.Server;
                    var mpdFile = Directory.GetFiles(httpServerUtility.MapPath(video.Path), "*.mpd").FirstOrDefault();

                    XDocument xDocument = XDocument.Load(mpdFile).Document;
                    XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();

                    XElement Period = xDocument.Descendants(xNamespace + "Period").FirstOrDefault();
                    XAttribute XType = new XAttribute(xNamespace + "type", "video");
                    XAttribute XStartTime = new XAttribute(xNamespace + "start", "0");

                    Period.Add(new XAttribute(xNamespace + "type", "video"));
                    Period.Add(new XAttribute("start", "0"));

                    // xAttributes.Add(XType);
                    // xAttributes.Add(XStartTime);

                    xDocument.Save(mpdFile);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }
    }
}