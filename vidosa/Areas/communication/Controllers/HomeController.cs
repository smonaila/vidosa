using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Configuration;
using System.Net.Mail;
using System.Web;
using System.Web.Mvc;
using System.Xml.Linq;
using vidosa.Areas.communication.Models;
using FileIO = System.IO.File;
using FileModes = System.IO;

namespace vidosa.Areas.communication.Controllers
{
    public class HomeController : Controller
    {
        // GET: communication/Home
        public ActionResult Index()
        {
            return View();
        }

        // GET: communication/SendEmail
        public ActionResult SendEmails()
        {
            try
            {
                string fileOpener = Server.MapPath(string.Format(@"/Areas/communication/EmailLists/EmailList.csv"));
                using (StreamReader stream = new StreamReader(FileIO.OpenRead(fileOpener)))
                {
                    var EmailList = new List<UserEmail>();
                    while (!stream.EndOfStream)
                    {
                        UserEmail userEmail = new UserEmail();

                        string currentLine = stream.ReadLine();

                        userEmail.EmailAddress = currentLine.Split(';')[1];
                        userEmail.FirstName = currentLine.Split(';')[0];
                        EmailList.Add(userEmail);
                    }

                    // Open the NewsLetter file
                    XDocument xDocument = XDocument.Load(Server.MapPath(@"/Areas/communication/NewsLetter/newsletter.html"));
                    XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();

                    var elemBody = (from ebody in xDocument.Descendants(xNamespace + "body")
                                    select ebody).FirstOrDefault();

                    var subscribeAnchor = (from subAnc in elemBody.Descendants(xNamespace + "a")
                                           where subAnc.Attribute("id").Value == "subscribe-anchor"
                                           select subAnc).FirstOrDefault();

                    var smtp = (SmtpSection)ConfigurationManager.GetSection("system.net/mailSettings/smtp");
                    foreach (var useremail in EmailList)
                    {
                        MailAddress mailAddress = new MailAddress(useremail.EmailAddress);
                        MailAddress fromEmailAdd = new MailAddress(smtp.From, "Coding Course");

                        string subject = string.Format("Coding Course - Forward to your Friend, Students, Collegue or Child");
                        var smtpClient = new SmtpClient()
                        {                            
                            Host = "smtp.gmail.com",
                            Port = 587,
                            EnableSsl = true,
                            UseDefaultCredentials = false,
                            DeliveryMethod = SmtpDeliveryMethod.Network,
                            Credentials = new NetworkCredential(smtp.From, smtp.Network.Password),
                        };

                        using (var message = new MailMessage(fromEmailAdd, mailAddress)
                        {
                            Subject = subject,
                            Body = elemBody.ToString(),
                            IsBodyHtml = true
                        })
                        {
                            smtpClient.Send(message);
                        }
                    }
                }
            }
            catch (Exception e)
            {

            }
            return View();
        }
    }
}