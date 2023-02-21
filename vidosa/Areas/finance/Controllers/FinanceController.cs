using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Web.Mvc;
using System.Xml.Linq;
using vidosa.Areas.finance.Models;
using vidosa.Models;
using System.Data.Entity;
using System.Collections.Specialized;
using System.Net;
using System.Collections.Generic;

namespace vidosa.Areas.finance.Controllers
{
    public class FinanceController : Controller
    {
        #region Fields
        private PayFastSettings payFastSettings; 
        #endregion
      
        #region Constructors
        public FinanceController()
        {
            // create an object of payFastSettings
            payFastSettings = new PayFastSettings();

            // assign values to payFastSetings Properties
            payFastSettings.MerchantId = ConfigurationManager.AppSettings["merchant_Id"];
            payFastSettings.MerchantKey = ConfigurationManager.AppSettings["merchant_Key"];
            payFastSettings.ProcessUrl = ConfigurationManager.AppSettings["process_url"];
            payFastSettings.PassPhrase = ConfigurationManager.AppSettings["pass_phrase"];
            payFastSettings.NotifyUrl = ConfigurationManager.AppSettings["notify_url"];
            payFastSettings.CancelUrl = ConfigurationManager.AppSettings["cancel_url"];
            payFastSettings.ReturnUrl = ConfigurationManager.AppSettings["return_url"];
        }
        #endregion Constructors

        // GET: finance/Finance
        [Authorize]
        public ActionResult Index()
        {
            using (VidosaContext Context = new VidosaContext())
            {
                var Videos = Context.Videos.Where(v => v.IsSubscription == true).ToList();
                ViewBag.CountSubs = Videos.Count;

                ViewBag.IsAjax = Request.IsAjaxRequest();
                ViewBag.Url = string.Format("{0}?ispartial=false", Request.Url.LocalPath);

                try
                {
                    if (User.Identity.IsAuthenticated)
                    {
                        for (int i = 0; i < Videos.Count; i++)
                        {
                            Videos[i].Duration = GetDuration(Videos[i]);
                            Videos[i].VideoDetails = (from vd in Context.VideoDetails.ToList()
                                                      where Videos[i].VideoId == vd.VideoId
                                                      select vd).FirstOrDefault().HtmlContent;
                        }
                    }
                }
                catch (Exception ex)
                {

                }                
                return View(Videos);
            }
        }

        /// <summary>
        /// This method reads the duration from the mpd file of the video
        /// </summary>
        /// <param name="video">the object representing the video to get the duration for</param>
        /// <returns></returns>
        [NonAction]
        public string GetDuration(Video video)
        {
            string duration = string.Empty;
            try
            {
                using (VidosaContext context = new VidosaContext())
                {
                    var mpdFilePath = Server.MapPath(string.Format(@"{0}/HD", video.Path));
                    var mpdFile = Directory.GetFiles(mpdFilePath, "*.mpd").FirstOrDefault();

                    // XML document for the mpdFile
                    XDocument xDocument = XDocument.Load(mpdFile);
                    XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();

                    var mpdElement = (from mpdEl in xDocument.Descendants(xNamespace + "MPD") select mpdEl).FirstOrDefault();
                    var presentationTime = mpdElement.Attribute("mediaPresentationDuration").Value.Replace("PT", "");

                    var Hour = Convert.ToInt32(presentationTime.Split('H')[0]);
                    var Minutes = Convert.ToInt32(presentationTime.Split('H')[1].Split('M')[0]);
                    var Seconds = Math.Floor(Convert.ToDouble(presentationTime.Split('M')[1].Replace("S", "")));

                    string strHour = Hour.ToString();
                    string strMin = Minutes.ToString();
                    string strSec = Seconds.ToString();

                    if (Hour < 10)
                    {
                        strHour = "0" + Hour;
                    }
                    if (Minutes < 10)
                    {
                        strMin = "0" + Minutes;
                    }
                    if (Seconds < 10)
                    {
                        strSec = "0" + Seconds;
                    }

                    // Work out the width of the Video
                    var adaptationSet = (from adpSet in xDocument.Descendants(xNamespace + "AdaptationSet") select adpSet)
                        .FirstOrDefault();
                    video.Height = Convert.ToInt32(adaptationSet.Attribute("maxHeight").Value);

                    duration = string.Format("{0}:{1}:{2}", strHour, strMin, strSec);
                }
            }
            catch (Exception)
            {

            }
            return duration;
        }


        // GET: Checkout page
        public ActionResult Checkout()
        {
            List<Video> checkedVideos = new List<Video>();
            try
            {
                string[] videoIds = Request.QueryString["checkedoutvideos"].Split(';');
                using (VidosaContext Context = new VidosaContext())
                {
                    for (int i = 0; i < videoIds.Length; i++)
                    {
                        checkedVideos.Add((from v in Context.Videos.ToList()
                                           where v.VideoId == videoIds[i]
                                           select v).FirstOrDefault());
                    }
                    foreach (var myvid in checkedVideos)
                    {
                        myvid.VideoDetails = (from v in Context.VideoDetails.ToList()
                                              where v.VideoId == myvid.VideoId
                                              select v).FirstOrDefault().HtmlContent;
                    }
                    ViewBag.IsAjax = Request.IsAjaxRequest();
                    ViewBag.Url = string.Format("{0}?ispartial=false&checkedoutvideos={1}", Request.Url.LocalPath, 
                        Request.QueryString["checkedoutvideos"]);
                    ViewBag.videoIds = Request.QueryString["checkedoutvideos"];

                    return PartialView(checkedVideos);
                }
            }
            catch (Exception)
            {

            }
            return View();
        }

        // GET OnceOffPayment
        [Authorize]
        public ActionResult OnceOffPayment()
        {
            try
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    string[] videoIds = Request.QueryString["checkedoutvideos"].Split(';');
                    List<Video> checkedVideos = new List<Video>();
                    decimal amount = 0.00m;

                    for (int i = 0; i < videoIds.Length; i++)
                    {
                        checkedVideos.Add((from v in Context.Videos.ToList()
                                           where v.VideoId == videoIds[i]
                                           select v).FirstOrDefault());
                    }
                    foreach (var myvid in checkedVideos)
                    {
                        amount += myvid.Price;
                    }
                   
                    PayFastSettings payFastSettings = new PayFastSettings(this.payFastSettings.PassPhrase);
                    ApplicationUser applicationUser = (from user in Context.Users
                                                       where user.Email == User.Identity.Name
                                                       select user).FirstOrDefault();

                    string PaymentId = payFastSettings.Encrypt(DateTime.Now.ToLongDateString());

                    for (int i = 0; i < checkedVideos.Count; i++)
                    {
                        Context.Sales.Add(new Sales()
                        {
                            CustomerId = applicationUser.UserId,
                            IsPaid = false,
                            PaymentId = PaymentId,
                            ProductId = checkedVideos[i].Id
                        });
                    }
                    Context.SaveChanges();

                    payFastSettings.MerchantId = this.payFastSettings.MerchantId;
                    payFastSettings.MerchantKey = this.payFastSettings.MerchantKey;
                    payFastSettings.ReturnUrl = this.payFastSettings.ReturnUrl;
                    payFastSettings.CancelUrl = this.payFastSettings.CancelUrl;
                    payFastSettings.NotifyUrl = this.payFastSettings.NotifyUrl;
                    payFastSettings.ProcessUrl = this.payFastSettings.ProcessUrl;

                    // Buyer Details
                    payFastSettings.Amount = amount;
                    payFastSettings.ItemName = "Videmy Courses";
                    payFastSettings.ItemDescription = "Payment of the selected courses";
                    payFastSettings.FirstName = applicationUser.FirstName;
                    payFastSettings.LastName = applicationUser.LastName;
                    payFastSettings.EmailAddress = applicationUser.Email;

                    // Transaction Options
                    payFastSettings.EmailConfirmation = true;
                    payFastSettings.ConfirmationAddress = "smonaila@gmail.com";

                    string RequestString = string.Format("merchant_id={0}&merchant_key={1}&", 
                        Uri.EscapeDataString(payFastSettings.MerchantId.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.MerchantKey.Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("return_url={0}&cancel_url={1}&", 
                        Uri.EscapeDataString(payFastSettings.ReturnUrl.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.CancelUrl.Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("notify_url={0}&name_first={1}&", 
                        Uri.EscapeDataString(payFastSettings.NotifyUrl.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.FirstName.Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("name_last={0}&email_address={1}&",
                        Uri.EscapeDataString(payFastSettings.LastName.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.EmailAddress.Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("m_payment_id={0}&amount={1}&", 
                        Uri.EscapeDataString(PaymentId.Trim()).Replace("%20", "+").Replace("%2B", "+"), 
                        Uri.EscapeDataString(payFastSettings.Amount.ToString().Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("item_name={0}&item_description={1}&",
                        Uri.EscapeDataString(payFastSettings.ItemName.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.ItemDescription.Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("email_confirmation={0}&confirmation_address={1}&",
                        Uri.EscapeDataString("1").Trim().Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(payFastSettings.EmailAddress.ToString().Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    RequestString += string.Format("payment_method={0}", 
                        Uri.EscapeDataString(("cc").Trim()).Replace("%20", "+").Replace("%2B", "+"));

                    payFastSettings.Signature = this.payFastSettings.Encrypt(RequestString);

                    RequestString += string.Format("&signature={0}", 
                        payFastSettings.Signature.Trim().Replace("%20", "+").Replace("%2B", "+"));

                    return Redirect(string.Format("{0}{1}", payFastSettings.ProcessUrl, RequestString));
                }
            }
            catch (Exception)
            {
                return View();
            }            
        }

        // GET
        [Authorize]
        public ActionResult Subscription()
        {
            try
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    PayFastSettings SubscriptionRequest = new PayFastSettings(this.payFastSettings.PassPhrase);
                    ApplicationUser CurrentUser = (from user in Context.Users
                                        where user.Email == User.Identity.Name
                                        select user).FirstOrDefault();

                    // Merchant Info
                    SubscriptionRequest.MerchantId = this.payFastSettings.MerchantId;
                    SubscriptionRequest.MerchantKey = this.payFastSettings.MerchantKey;
                    SubscriptionRequest.ProcessUrl = this.payFastSettings.ProcessUrl;
                    SubscriptionRequest.CancelUrl = this.payFastSettings.CancelUrl;
                    SubscriptionRequest.ReturnUrl = this.payFastSettings.ReturnUrl;
                    SubscriptionRequest.NotifyUrl = this.payFastSettings.NotifyUrl;

                    // Transaction Details
                    SubscriptionRequest.Amount = 250;
                    SubscriptionRequest.ItemName = string.Format("{0} {1} *** STVC", CurrentUser.FirstName, CurrentUser.LastName);
                    SubscriptionRequest.EmailConfirmation = true;
                    SubscriptionRequest.ConfirmationAddress = CurrentUser.Email;

                    string day = DateTime.Now.Day < 10 ? string.Format("{0}{1}", "0", DateTime.Now.Day) : DateTime.Now.Day.ToString();
                    string month = DateTime.Now.Month < 10 ? string.Format("{0}{1}", "0", DateTime.Now.Month) :
                        DateTime.Now.Month.ToString();

                    SubscriptionRequest.RecurringAmount = 250;
                    SubscriptionRequest.BillingDate = string.Format("{0}-{1}-{2}", DateTime.Now.Year, month, day);
                    SubscriptionRequest.subscriptionFrequency = PayFastSettings.SubscriptionFrequency.Monthly;
                    SubscriptionRequest.Subscription_Type = PayFastSettings.SubscriptionType.Subscription;
                    SubscriptionRequest.Cycles = 0;
                    SubscriptionRequest.ItemDescription = string.Format("{0} {1} Subscribed to STVC", CurrentUser.FirstName, CurrentUser.LastName);
                    SubscriptionRequest.FirstName = CurrentUser.FirstName;
                    SubscriptionRequest.LastName = CurrentUser.LastName;

                    string RedirectToPayFastUrl = string.Format("merchant_id={0}&merchant_key={1}&",
                        SubscriptionRequest.MerchantId.Trim(),
                        SubscriptionRequest.MerchantKey.Trim()).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("return_url={0}&cancel_url={1}&",
                        Uri.EscapeDataString(SubscriptionRequest.ReturnUrl.Trim()),
                        Uri.EscapeDataString(SubscriptionRequest.CancelUrl.Trim())).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("notify_url={0}&name_first={1}&",
                        Uri.EscapeDataString(SubscriptionRequest.NotifyUrl.Trim()),
                        SubscriptionRequest.FirstName.Trim()).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("name_last={0}&email_address={1}&",
                        Uri.EscapeDataString(SubscriptionRequest.LastName.Trim()).Replace("%20", "+").Replace("%2B", "+"),
                        Uri.EscapeDataString(SubscriptionRequest.ConfirmationAddress.Trim())).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("amount={0}&item_name={1}&",
                        SubscriptionRequest.Amount.ToString().Trim(),
                        Uri.EscapeDataString(SubscriptionRequest.ItemName.Trim())).Replace("%20", "+").Replace("%2B", "+");
                    RedirectToPayFastUrl += string.Format("item_description={0}&",
                        Uri.EscapeDataString(SubscriptionRequest.ItemDescription.Trim()));

                    // Custom variables for to identify the order.
                    RedirectToPayFastUrl += string.Format("subscription_type={0}&",
                        ((int)(SubscriptionRequest.Subscription_Type)).ToString().Trim()).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("billing_date={0}&recurring_amount={1}&",
                        Uri.EscapeDataString(SubscriptionRequest.BillingDate.Trim()),
                        SubscriptionRequest.RecurringAmount.ToString().Trim()).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl += string.Format("frequency={0}&cycles={1}",
                      Uri.EscapeDataString(((int)SubscriptionRequest.subscriptionFrequency).ToString().Trim()),
                      SubscriptionRequest.Cycles.ToString().Trim()).Replace("%20", "+").Replace("%2B", "+");

                    RedirectToPayFastUrl.Trim();
                    SubscriptionRequest.Signature = this.payFastSettings.Encrypt(RedirectToPayFastUrl);
                    RedirectToPayFastUrl += string.Format("&signature={0}", SubscriptionRequest.Signature);

                    RedirectToPayFastUrl = string.Format("{0}{1}", this.payFastSettings.ProcessUrl, RedirectToPayFastUrl);
                    return Redirect(RedirectToPayFastUrl);
                }
            }
            catch (Exception ex)
            {

            }
            return View();
        }

        // GET: Success page
        public ActionResult PaymentSuccess()
        {
            using (VidosaContext Context = new VidosaContext())
            {
                string userId = Request.QueryString["customerId"];
                string productId = Request.QueryString["productId"];

                Sales sale = new Sales()
                {
                    CustomerId = Convert.ToInt32(userId),
                    ProductId = Convert.ToInt32(productId)
                };
                Context.Sales.Add(sale);
                Context.SaveChanges();
            }
            return View();
        }

        // User will be returned here after the payment is successfull.
        public ActionResult ReturnUrl()
        {
            return View();
        }

        // This is the Notity_Url, payfast will post the variables here to notify of the successfull
        // payment.
        [HttpPost]
        public HttpStatusCodeResult NotifyUrl()
        {
            try
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    // Get the posted variables
                    NameValueCollection postedVariables = Request.Form;
                    ApplicationUser CurrentUser;

                    if (postedVariables.Count <= 0)
                    {
                        return new HttpStatusCodeResult(HttpStatusCode.OK);
                    }
                    
                    var m_payment_id = postedVariables["m_payment_id"];
                    var pf_payment_id = postedVariables["pf_payment_id"];
                    var payment_status = postedVariables["payment_status"];
                    var item_name = postedVariables["item_name"];
                    var item_description = postedVariables["item_description"];
                    var amount_gross = postedVariables["amount_gross"];
                    var amount_fee = postedVariables["amount_fee"];
                    var amount_net = postedVariables["amount_net"];
                    var email_address = postedVariables["email_address"] is null ? "": postedVariables["email_address"];
                    var merchant_id = postedVariables["merchant_id"];
                    var token = postedVariables["token"] is null ? string.Empty : postedVariables["token"];

                    var Transaction = new Transactions()
                    {
                        AmountFee = Convert.ToDecimal(amount_fee),
                        AmountNet = Convert.ToDecimal(amount_net),
                        GrossAmount = Convert.ToDecimal(amount_gross),
                        PaymentId = m_payment_id,
                        pf_PaymentId = pf_payment_id,
                        TransDate = DateTime.Now,
                        TransStatus = payment_status
                    };
                    Context.Transactions.Add(Transaction);

                    if (token != string.Empty)
                    {
                        PremiumSubs premiumSubs = Context.PremiumSubs.Where(p => p.Token.Equals(token)).FirstOrDefault();
                        if (!(premiumSubs is null))
                        {
                            // Already Subscribed
                            CurrentUser = Context.Users.Where(u => u.UserName.Equals(premiumSubs.Username)).FirstOrDefault();
                            

                            // Sercurity checks code goes here
                            string site = ConfigurationManager.AppSettings["test_validation_process_url"];

                            // Save the Transaction if the status is COMPLETE
                            if (Transaction.TransStatus.Equals("COMPLETE"))
                            {
                                premiumSubs.IsActive = true;
                                Transaction.UserId = CurrentUser.UserId;
                                Context.SaveChanges();
                                return new HttpStatusCodeResult(HttpStatusCode.OK);
                            }
                            else
                            {
                                // Else Email the User that his transaction is not successfull
                                premiumSubs.IsActive = false;
                                Transaction.UserId = CurrentUser.UserId;
                                if (ProcessTran(postedVariables, merchant_id)) Context.SaveChanges();
                                return new HttpStatusCodeResult(HttpStatusCode.OK);
                            }
                        }
                        else
                        {
                            // User Subscribing for the first time
                            CurrentUser = Context.Users.Where(u => u.UserName.Equals(email_address)).FirstOrDefault();
                            premiumSubs = new PremiumSubs()
                            {
                                Token = token,
                                Username = CurrentUser.UserName
                            };
                            Context.PremiumSubs.Add(premiumSubs);

                            // Sercurity Check code goes here


                            // Save the Transaction if the status is COMPLETE
                            if (Transaction.TransStatus.Equals("COMPLETE"))
                            {
                                premiumSubs.IsActive = true;
                                Transaction.UserId = CurrentUser.UserId;
                                Context.Entry(premiumSubs).State = EntityState.Added;

                                if (ProcessTran(postedVariables, merchant_id)) Context.SaveChanges();
                                return new HttpStatusCodeResult(HttpStatusCode.OK);
                            }
                            else
                            {
                                // Else Email the User that his transaction is not successfull
                                premiumSubs.IsActive = false;
                                Transaction.UserId = CurrentUser.UserId;
                                if (ProcessTran(postedVariables, merchant_id)) Context.SaveChanges();
                                return new HttpStatusCodeResult(HttpStatusCode.OK);
                            }
                        }
                    }
                    else
                    {
                        // This is the Once off payment
                        List<Sales> sales = Context.Sales.Where(s => s.PaymentId.Equals(m_payment_id)).ToList();
                        for (int i = 0; i < sales.Count; i++)
                        {
                            sales[i].IsPaid = true;
                            Context.Entry(sales[i]).State = EntityState.Modified;
                        }

                        if (Transaction.TransStatus.Equals("COMPLETE"))
                        {
                            if(ProcessTran(postedVariables, merchant_id)) Context.SaveChanges();                            
                            return new HttpStatusCodeResult(HttpStatusCode.OK);
                        }
                        else
                        {
                            // The Transaction was not successfull
                            for (int i = 0; i < sales.Count; i++)
                            {
                                sales[i].IsPaid = false;
                                Context.Entry(sales[i]).State = EntityState.Modified;
                            }
                            return new HttpStatusCodeResult(HttpStatusCode.OK);
                        }
                    }         
                }
            }
            catch (Exception ex)
            {
                
            }
            return new HttpStatusCodeResult(HttpStatusCode.InternalServerError);
        }

        [NonAction]
        public bool ProcessTran(NameValueCollection postedVariables, string merchant_id)
        {
            // get the requesting ip Address
            string requestIp = HttpContext.Request.ServerVariables["REMOTE_ADDR"];

            if (postedVariables["signature"] == null)
            {
                throw new Exception("Signature cannot be null");
            }

            // create a string of posted variables
            string strPostedVar = string.Empty;
            for (int i = 0; i < postedVariables.Count; i++)
            {
                if (postedVariables.Keys[i] != "signature")
                {
                    strPostedVar += string.Format("{0}={1}&", postedVariables.Keys[i],
                        Uri.EscapeDataString(postedVariables[i].Trim()).Replace("%2B", "+").Replace("%20", "+"));
                }
            }
            strPostedVar = strPostedVar.TrimEnd(new char[] { '&' });

            if (!(this.payFastSettings.Encrypt(strPostedVar) == postedVariables["signature"]))
            {
                throw new Exception("Signature do not match");
            }
            this.payFastSettings.SecurityChecks(postedVariables, merchant_id, requestIp);

            return true;
        }

        // GET: cancel page
        public ActionResult CancelPayment()
        {
            return View();
        }
    }
}