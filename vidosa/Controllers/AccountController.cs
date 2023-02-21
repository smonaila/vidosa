using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin.Security;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Configuration;
using System.Data;
using System.Data.Entity;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Configuration;
using System.Net.Mail;
using System.Runtime.Remoting.Contexts;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using System.Web.Security;
using System.Xml.Linq;
using vidosa.Models;
using vidosa.vidosadsTableAdapters;

namespace vidosa.Controllers
{
    [Authorize]
    public class AccountController : Controller
    {
        private ApplicationUserManager _userManager;
        private ApplicationSignInManager _signinManager;

        public AccountController() { }
        public AccountController(ApplicationSignInManager signInManager, ApplicationUserManager userManager)
        {
            _userManager = userManager;
            _signinManager = signInManager;
        }

        #region Properties to get the userManager object and the signInManager object
        public ApplicationUserManager UserManager
        {
            get { return _userManager ?? HttpContext.GetOwinContext().Get<ApplicationUserManager>(); }
            set { _userManager = value; }
        }

        public ApplicationSignInManager SignInManager
        {
            get { return _signinManager ?? HttpContext.GetOwinContext().Get<ApplicationSignInManager>(); }
        }
        #endregion

        // GET: Account
        [AllowAnonymous]
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult UserVideos()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = vidosaContext.Users.Where(u => u.Email == User.Identity.Name).FirstOrDefault();

                    List<Video> videos = vidosaContext.Videos.Where(v => v.UserId == applicationUser.Id).ToList();

                    return View(videos); 
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // GET: EditProfile
        public ActionResult EditProfile()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {

                    ApplicationUser applicationUser = (from au in vidosaContext.Users
                                                       where au.Email == User.Identity.Name
                                                       select au).FirstOrDefault();

                    EditProfileView editProfileView = new EditProfileView();
                    editProfileView.Email = applicationUser.Email;
                    editProfileView.FirstName = applicationUser.FirstName;
                    editProfileView.LastName = applicationUser.LastName;
                    editProfileView.Username = applicationUser.UserName;
                    editProfileView.AccCrtDate = applicationUser.AccCrtDate;
                    editProfileView.AccessFailedCount = applicationUser.AccessFailedCount;
                    editProfileView.LockoutEnabled = applicationUser.LockoutEnabled;
                    editProfileView.LockoutEndDateUtc = applicationUser.LockoutEndDateUtc;
                    editProfileView.PhoneNumber = applicationUser.PhoneNumber;
                    editProfileView.PhoneNumberConfirmed = applicationUser.PhoneNumberConfirmed;

                    return View(editProfileView);
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        [HttpPost]
        public ActionResult UploadProfilePic()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    HttpFileCollectionBase httpFiles = Request.Files;
                    HttpPostedFile[] Files = new HttpPostedFile[httpFiles.Count];
                    httpFiles.CopyTo(Files, 0);

                    ApplicationUser applicationUser = (from u in vidosaContext.Users
                                                       where u.Email == User.Identity.Name
                                                       select u).FirstOrDefault();

                    applicationUser.ProfilePic = Files[0].FileName;

                    List<string> ProfilePics = Directory.GetFiles(Server.MapPath(string.Format("/Images/"))).ToList();
                    if (ProfilePics.Exists(ppFile => ppFile == Server.MapPath(string.Format("/Images/{0}", applicationUser.ProfilePic))))
                    {
                        string OldFileName = ProfilePics.Find(profilePic => profilePic == Server.MapPath(string.Format("/Images/{0}", applicationUser.ProfilePic)));

                        FileInfo fileInfo = new FileInfo(OldFileName);
                        int Seconds = DateTime.Now.Second;                        
                        if (!Directory.Exists(Server.MapPath(string.Format("/Images/{0}", applicationUser.Email))))
                        {
                            Directory.CreateDirectory(Server.MapPath(string.Format("/Images/{0}", applicationUser.Email)));
                        }
                        string NewFileName = Server.MapPath(string.Format("/Images/{0}/{1}{2}{3}", applicationUser.Email, applicationUser.FirstName, string.Format("{0}{1}{2}{3}{4}{5}", DateTime.Now.Day, DateTime.Now.Month, DateTime.Now.Year, DateTime.Now.Hour, DateTime.Now.Minute, Seconds), fileInfo.Extension));

                        fileInfo.CopyTo(NewFileName);
                        Files[0].SaveAs(Server.MapPath(string.Format("/Images/{0}", Files[0].FileName)));
                    }
                    else
                    {
                        Files[0].SaveAs(Server.MapPath(string.Format("/Images/{0}", Files[0].FileName)));
                    }
                    vidosaContext.Entry(applicationUser).State = EntityState.Modified;
                    vidosaContext.SaveChanges();
                    
                    return Json(new { FileSaved = true, Url = string.Format("/Images/{0}", applicationUser.ProfilePic) }, JsonRequestBehavior.AllowGet);
                }
                catch (Exception)
                {
                    throw;
                }                 
            }
        }

        // POST: EditProfile
        [HttpPost]
        public ActionResult SaveProfile(RegistrationView editProfileView)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    ApplicationUser applicationUser = (from au in vidosaContext.Users
                                                       where au.Email == User.Identity.Name
                                                       select au).FirstOrDefault();

                    applicationUser.Email = editProfileView.Email;
                    applicationUser.FirstName = editProfileView.FirstName;
                    applicationUser.LastName = editProfileView.LastName;
                    applicationUser.UserName = editProfileView.Username;

                    vidosaContext.Entry(applicationUser).State = EntityState.Modified;
                    vidosaContext.SaveChanges();

                    return RedirectToAction("EditProfile");
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        // GET: GetUser
        [AllowAnonymous]
        public ActionResult GetUser()
        {
            bool IsAuthenticated = User.Identity.IsAuthenticated;

            if (User.Identity.IsAuthenticated)
            {
                using (VidosaContext context = new VidosaContext())
                {
                    ApplicationUser user = context.Users.Where(u => u.UserName == User.Identity.Name).FirstOrDefault();
                    bool IsSubUser = context.PremiumSubs.Where(p => p.Username == user.Email).FirstOrDefault() is null ? false : true;

                    return Json(new { IsAuthenticated = true, FirtstName = user.FirstName, LastName = user.LastName,
                    IsSubUser = IsSubUser }, JsonRequestBehavior.AllowGet);
                }
            }
            else
            {
                return Json(new { IsAuthenticated = false }, JsonRequestBehavior.AllowGet);
            }            
        }

        // POST: Confirm news letter subscription
        [AllowAnonymous]
        public ActionResult ActivateEmail()
        {
            string activationCode = Request.QueryString["ac"];            
            using (VidosaContext Context = new VidosaContext())
            {
                EmailList email = Context.Emails.Where(e => e.ActivationCode == activationCode).FirstOrDefault();
                if (email != null && email.IsActive == false)
                {
                    RouteValueDictionary valuePairs = new RouteValueDictionary();
                    valuePairs.Add("email", email.EmailAddress);
                    email.IsActive = true;
                    Context.Entry(email).State = EntityState.Modified;
                    Context.SaveChanges();

                    ViewBag.IsAjax = Request.IsAjaxRequest();
                    ViewBag.Url = string.Format("{0}?ispartial=false", Request.Url.LocalPath);

                    return View(email);         
                }
                else
                {
                    RedirectToAction("");
                }
            }
            return View();
        }

        // Reset User Password
        [AllowAnonymous]
        public ActionResult ResetPassword()
        {
            ViewBag.ResetPasswordHeader = "Enter your FullName and Email used to create the Account";
            ViewBag.ResetPasswordMessage = "";

            ViewBag.IsAjax = Request.IsAjaxRequest();
            ViewBag.Url = string.Format("{0}?ispartial=false", Request.Url.LocalPath);

            try
            {
                bool IsPartial = Convert.ToBoolean(Request.QueryString["ispartial"]);
                if (IsPartial)
                {                    
                    return PartialView("PartialResetPassword");
                }
            }
            catch (Exception ex)
            {

            }
            return View();
        }

        // New Password Fields
        public ActionResult NewPassword()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                // string ActivationCode = Request.QueryString["ac"];
                // ApplicationUser user = (from us in vidosaContext.Users
                //             where us.ActivationCode.ToString().Equals(ActivationCode)
                //             select us).FirstOrDefault();

                // ViewBag.NewPasswordHeader = "Please Enter a New Password";
                // ViewBag.PasswordChanged = "";

                return PartialView();
            }
        }

        // Reset the Password with the New Entered Password
        [HttpPost]
        public ActionResult NewPassword(string email, string newpassword, string confirmpassword)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                //Func<string, string> hashPasswordFun = (p) =>
                //{
                //    using (SHA256Managed sha = new SHA256Managed())
                //    {
                //        byte[] passwordBytes = Encoding.UTF8.GetBytes(p);
                //        byte[] passwordhash = sha.ComputeHash(passwordBytes);
                //        return BitConverter.ToString(passwordhash);
                //    }
                //};
                //string newPassword = hashPasswordFun(newpassword).Replace("-", string.Empty);

                //User user = vidosaContext.Users.Where(u => u.Email.Equals(email)).FirstOrDefault();
                //user.Password = newPassword;
                //vidosaContext.Entry(user).State = EntityState.Modified;
                //vidosaContext.SaveChanges();

                //ViewBag.NewPasswordHeader = "Please Enter a New Password";
                //ViewBag.PasswordChanged = "Password successfully reset";

                
                return PartialView("PartialNewPassword");
            }            
        }

        // Reset the Password By receiving a New Password
        [HttpPost]
        public ActionResult ResetPassword(string FirstName, string Email)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                //string activationCode = vidosaContext
                //    .Users.Where(u => u.Email.Equals(Email)).FirstOrDefault()
                //    .ActivationCode.ToString();
                //string link = string.Format("{0}://{1}/Account/NewPassword?ac={2}",
                //   Request.Url.Scheme, Request.Url.Host, activationCode);

                //MailAddress fromEmail = new MailAddress("smonaila@gmail.com", "Password Reset");
                //MailAddress toEmail = new MailAddress(Email);

                //var fromEmailPassword = "-cS]3K7p9Sd$/CU9";
                //string subject = string.Format("Reseting your Password - {0}", FirstName);

                //string body = string.Format("<br/> Hi {0}, <br />please click the following link to Reset your password" +
                //    "<br/><a href='{1}'>{2}</a>", FirstName, link, link);

                //var smtp = new SmtpClient()
                //{
                //    Host = "smtp.gmail.com",
                //    Port = 587,
                //    EnableSsl = true,
                //    DeliveryMethod = SmtpDeliveryMethod.Network,
                //    UseDefaultCredentials = false,
                //    Credentials = new NetworkCredential(fromEmail.Address, fromEmailPassword)
                //};

                //using (var message = new MailMessage(fromEmail, toEmail)
                //{
                //    Subject = subject,
                //    Body = body,
                //    IsBodyHtml = true
                //})
                //{
                //    smtp.Send(message);
                //}

                //// Write the Reseting Password Message
                //ViewBag.ResetPasswordMessage = "We sent you a link to your email to reset your password";
                //ViewBag.ResetPasswordHeader = "Enter your FullName and Email used to create the Account";

                bool IsPartial = Convert.ToBoolean(Request.QueryString["ispartial"]);
                if (IsPartial)
                {                    
                    return PartialView("PartialResetPassword");
                }
                else
                {
                    return View();
                }               
            }
        }

        // Activate the Account for Notification
        [HttpPost]
        [AllowAnonymous]
        public ActionResult ActivateEmail(EmailList user)
        {
            if (ModelState.IsValid)
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    EmailList email = (from em in Context.Emails.ToList()
                                       where em.EmailAddress == user.EmailAddress
                                       select em).FirstOrDefault();

                    email.IsActive = true;
                    email.Password = user.Password;
                    email.EmailAddress = user.EmailAddress;
                    email.ConfirmPassword = user.ConfirmPassword;
                    email.EmailId = email.EmailId;
                    email.FirstName = user.FirstName;

                    Context.Entry(email).State = EntityState.Modified;
                    Context.SaveChanges();
                }
            }            
            return View();
        }

        [HttpGet]
        [AllowAnonymous]
        public ActionResult NewsLetter()
        {
            return PartialView();
        }

        // POST: Subscribe to the News Letter
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult> NewsLetter(NewsLetterView newsLetterView)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    XDocument htmlEmail = XDocument.Load(Server.MapPath("/NewsLetters/confirmEmail.html"));
                    XNamespace xNamespace = htmlEmail.Document.Root.GetDefaultNamespace();

                    // get the body element
                    var elemBody = (from em in htmlEmail.Descendants(xNamespace + "body")
                                    select em).FirstOrDefault();

                    // get the confirm email anchor and modify it accordingly
                    var elemEmailConfirm = (from anchorelem in elemBody.Descendants(xNamespace + "a")
                                            where anchorelem.Attribute("id").Value == "confirmemail"
                                            select anchorelem).FirstOrDefault();

                    // the href value of confirm email anchor
                    var hrefAttr = elemEmailConfirm.Attribute("href");

                    // the activation code for this account
                    string activationCode = Guid.NewGuid().ToString();
                    hrefAttr.Value = string.Format("{0}?ac={1}&ispartial={2}&target={3}",
                        hrefAttr.Value, activationCode, false, "_blank");

                    string email = Request.Form["email"];
                    string firstName = Request.Form["firstname"];

                    // get the user's firstName
                    var elemFirstName = (from spanFname in elemBody.Descendants(xNamespace + "span")
                                         where spanFname.Attribute("class").Value == "username"
                                         select spanFname);

                    // Get the requesting Ip Address
                    string requestingIp = HttpContext.Request.ServerVariables["REMOTE_ADDR"];

                    // Assign the FirstName Value from the data entered by the user
                    foreach (var span in elemFirstName)
                    {
                        span.Value = firstName;
                    }

                    // Create the email service objects to send an email.
                    EmailService emailService = new EmailService();
                    IdentityMessage identityMessage = new IdentityMessage();
                    identityMessage.Subject = string.Format("Vidosa - Email Confirmation for {0}", firstName);
                    identityMessage.Destination = Request["email"];
                    identityMessage.Body = elemBody.ToString();


                    using (VidosaContext Context = new VidosaContext())
                    {
                        // Search for the current Ip Address 
                        var ipA = (from e in Context.Emails
                                   where e.IpAddress == requestingIp
                                   select e).FirstOrDefault();

                        EmailList emailList = new EmailList();

                        if (ipA is null)
                        {
                            var e = (from el in Context.Emails where el.EmailAddress == email select el).FirstOrDefault();
                            if (e is null)
                            {
                                emailList.IsActive = false;
                                emailList.ActivationCode = activationCode;
                                emailList.EmailAddress = email;
                                emailList.FirstName = firstName;
                                emailList.IpAddress = requestingIp;

                                Context.Emails.Add(emailList);
                                Context.SaveChanges();

                                await emailService.SendAsync(identityMessage);

                                // Notify the user about activating their email.
                                ModelState.AddModelError("sub", string.Format("Hi {0}, We have sent a link to {0} for instruction on how to activate the email to receive our news letter", email));
                            }
                            else
                            {
                                if (emailList.IsActive)
                                {
                                    ModelState.AddModelError("sub", string.Format("Email address already exists"));
                                }
                                else
                                {
                                    emailList.IsActive = emailList.IsActive;
                                    emailList.ActivationCode = emailList.ActivationCode;
                                    emailList.FirstName = emailList.FirstName;
                                    emailList.IpAddress = requestingIp;
                                    emailList.EmailAddress = email;

                                    Context.Entry(emailList).State = EntityState.Modified;
                                    Context.SaveChanges();

                                    // Resend the new link
                                    await emailService.SendAsync(identityMessage);

                                    // Notify the user about activating their email.
                                    ModelState.AddModelError("sub", string.Format("This email already exists but needs to be activated, we have sent a link to {0} for instruction on how to activate it to receive our news letter", email));
                                }                                
                            }
                        }
                        else
                        {
                            EmailList regEmails = Context.Emails.Where(e => e.EmailAddress == email).FirstOrDefault();
                            if (regEmails is null)
                            {
                                regEmails = new EmailList();
                                regEmails.IsActive = false;
                                regEmails.ActivationCode = activationCode;
                                regEmails.EmailAddress = email;
                                regEmails.FirstName = firstName;
                                regEmails.IpAddress = requestingIp;
                                regEmails.SubDate = DateTime.Now;

                                Context.Emails.Add(regEmails);
                                Context.SaveChanges();

                                await emailService.SendAsync(identityMessage);

                                ModelState.AddModelError("emailMessage", string.Format("We have sent an email to {0} to confirm that it belongs to you", identityMessage.Destination));
                            }
                            else
                            {
                                if (regEmails.IsActive)
                                {
                                    // Activate Message
                                    ModelState.AddModelError("am", string.Format("The email is already active"));
                                }
                                else
                                {
                                    // Update the registered email
                                    regEmails.IsActive = false;
                                    regEmails.ActivationCode = activationCode;
                                    regEmails.EmailAddress = email;
                                    regEmails.FirstName = firstName;
                                    regEmails.IpAddress = requestingIp;
                                    regEmails.SubDate = DateTime.Now;

                                    Context.Entry(regEmails).State = EntityState.Modified;
                                    Context.SaveChanges();

                                    // The email is not active. resend the activation
                                    await emailService.SendAsync(identityMessage);

                                    ModelState.AddModelError("emailMessage", string.Format("We have sent an email to {0} to confirm that it belongs to you", identityMessage.Destination));
                                }
                            }
                        }
                    }
                }
                catch (SmtpException smtpException)
                {
                    // There was an error sending the email
                    // Make sure that you remove the added record from the email List table.
                    using (VidosaContext vidosaContext = new VidosaContext())
                    {
                        var email_Add = Request["email"];
                        EmailList email = (from el in vidosaContext.Emails
                                           where el.EmailAddress == email_Add
                                           select el).FirstOrDefault();

                        if (!(email is null))
                        {
                            vidosaContext.Entry(email).State = EntityState.Deleted;
                            vidosaContext.SaveChanges();
                        }
                        ModelState.AddModelError("emailMessage",
                            string.Format("There was an error sending to this email {0} Please ensure that you have entered the correct email address",
                            Request["email"]));
                    }
                }
                catch (Exception exception)
                {
                    ModelState.AddModelError("error", string.Format("Hi {0}, An unknown error occured when sending email to {1}.", Request["firstname"], Request["email"]));
                }
            }
            else
            {
                ModelState.AddModelError("empty_fields", string.Format("{0}", "Empty Field are not allowed"));
            }
            return PartialView(newsLetterView);
        }

        // GET: Request to create an Account
        [AllowAnonymous]
        public ActionResult CreateAccount()
        {
            RegistrationView regView = new RegistrationView();
            ViewBag.ReturnUrl = Request.QueryString["return_url"] is null ? string.Empty : Request.QueryString["return_url"];
            return View(regView);
        }

        // POST: Create an Account
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult> CreateAccount(RegistrationView registrationView)
        {
            bool statusRegistration = false;
            string messageRegistration = string.Empty;

            using (VidosaContext Context = new VidosaContext())
            {
                if (ModelState.IsValid)
                {
                    try
                    {
                        // Email Verification
                        var applicationUser = await UserManager.FindByEmailAsync(registrationView.Email);
                        if (!(applicationUser is null))
                        {
                            ModelState.AddModelError("Warning Email:", "Sorry: Email already Exists");
                            return PartialView(registrationView);
                        }

                        // Save UserData
                        var user = new ApplicationUser
                        {
                            Email = registrationView.Email,
                            LastName = registrationView.LastName,
                            FirstName = registrationView.FirstName,
                            UserName = registrationView.Username,
                            AccCrtDate = DateTime.Now,
                            SecurityStamp = Guid.NewGuid().ToString().Replace("-", ""),
                            Id = Guid.NewGuid().ToString().Replace("-", "")
                        };

                        var result = await UserManager.CreateAsync(user, registrationView.Password);
                        if (result.Succeeded)
                        {
                            await VerificationEmail(registrationView.Email, user.SecurityStamp);
                            var return_url = Request.QueryString["return_url"] is null ? string.Empty : Request.QueryString["return_url"];

                            LoginView loginView = new LoginView();
                            loginView.Username = registrationView.Email;
                            loginView.Password = string.Empty;
                            loginView.RememberMe = false;

                            ModelState.AddModelError("emailNotification", string.Format("We have sent a message to {0}, please check the email follow the instructions to activate your account.", loginView.Username));

                            return View("Login", loginView);
                        }
                        else
                        {
                            // Something went wrong when sending an email to the supplied email address.
                            ModelState.AddModelError("loginError",
                                string.Format("The User could not be logged in."));

                            return PartialView(registrationView);
                        }
                    }
                    catch (SmtpException smtpException)
                    {
                        var applicationUser = await UserManager.FindByEmailAsync(registrationView.Email);
                        Context.Entry(applicationUser).State = EntityState.Deleted;
                        Context.SaveChanges();

                        // Something went wrong when sending an email to the supplied email address.
                        ModelState.AddModelError("emailError", 
                            string.Format("The account cannot be created because the email does not exist. Please make sure that you have entered the correct email and try again"));

                        return PartialView(registrationView);
                    }
                    catch (Exception exception)
                    {
                        // A general error.
                        var applicationUser = await UserManager.FindByEmailAsync(registrationView.Email);
                        Context.Entry(applicationUser).State = EntityState.Deleted;
                        Context.SaveChanges();

                        // Something went wrong when sending an email to the supplied email address.
                        ModelState.AddModelError("emailGeneralError",
                            string.Format("The account cannot be created because the email does not exist. Please make sure that you have entered the correct email and try again"));

                        return PartialView(registrationView);
                    }
                }
                else
                {
                    messageRegistration = "Something Wrong!";
                    ViewBag.Message = messageRegistration;
                    ViewBag.Status = statusRegistration;

                    // Something went wrong when sending an email to the supplied email address.
                    //ModelState.AddModelError("emailGeneralError",
                    //    string.Format("The Model"));

                    return PartialView(registrationView);
                }                
            }
        }

        [NonAction]
        private async Task VerificationEmail(string email, string activationCode)
        {
            try
            {
                var url = string.Format("/Account/ActivationAccount?sts={0}", activationCode);
                var link = Request.Url.AbsoluteUri.Replace(Request.Url.PathAndQuery, url);

                EmailService emailService = new EmailService();
                IdentityMessage identityMessage = new IdentityMessage();
                identityMessage.Destination = email;
                identityMessage.Subject = string.Format("Account Activation");
                identityMessage.Body = string.Format("<br/> Please click on the following link in order to activate your account<br/><a href='{0}'>{1}</a>", link, link);

                await emailService.SendAsync(identityMessage);
            }
            catch (SmtpException smtpException)
            {
                throw new SmtpException(string.Format("Account could not be created"), smtpException);
            }
        }

        [AllowAnonymous]
        public ActionResult ExternalLoginConfirmation()
        {
            ExternalLoginConfirmationViewModel model = new ExternalLoginConfirmationViewModel
            { Email = "smonaila@gmail.com", Username = "smonaila@gmail.com" };
            return View(model);
        }

        // GET: Request to login to an account
        [AllowAnonymous]
        public ActionResult Login(string returnUrl)
        {
            ViewBag.ReturnUrl = returnUrl;
            ViewBag.IsAjax = Request.IsAjaxRequest();

            if (Utility.IsCrawlbot(Request))
            {
                Video video = null;
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Bot bot = (from b in vidosaContext.Bots
                               where b.GetIpAddress == Request.UserHostAddress
                               select b).FirstOrDefault();

                    string[] variables = returnUrl.Split('?')[1].Split('&');
                    string videoId = variables.First(v => v.Split('=')[0] == "v").Split('=')[1];

                    video = (from v in vidosaContext.Videos
                             where v.VideoId == videoId
                             select v).FirstOrDefault();


                    if (bot == null)
                    {
                        bot = new Bot();
                        bot.Username = string.Format("{0}@vidosa.co.za", Utility.GetBotName(Request.UserAgent));
                        bot.GetUserAgentString = Request.UserAgent;
                        bot.GetIpAddress = Request.UserHostAddress;
                        bot.GetName = Utility.GetBotName(Request.UserAgent);
                        vidosaContext.Bots.Add(bot);
                        vidosaContext.SaveChanges();
                    }

                    Principal principal = new Principal();
                    principal.FirstName = bot.GetName;
                    principal.LastName = bot.GetName;
                    principal.Username = bot.Username;

                    PrincipalIdentity principalIdentity = new PrincipalIdentity();
                    principalIdentity.AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie;
                    principalIdentity.IsAuthenticated = true;
                    principalIdentity.Name = principal.Username;
                    principal.Identity = principalIdentity;

                    Request.RequestContext.HttpContext.User = principal;                    
                }
                RouteValueDictionary valuePairs = new RouteValueDictionary();
                
                string QueryString = string.Empty;
                NameValueCollection valueCollection = new NameValueCollection();
                return View("CrawlerVideoPage", "_Layout",  video);
            }

            if (!(returnUrl is null))
            {
                if (!returnUrl.Equals(string.Empty))
                {
                    ViewBag.Url = string.Format("{0}?ReturnUrl={1}", Request.Url.LocalPath, returnUrl);
                }                
            }
            else
            {
                ViewBag.Url = string.Format("{0}?ispartial=false", Request.Url.LocalPath);
            }
            return View();
        }

        // POST: Login to an account
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult> Login(LoginView loginView, string ReturnUrl = "")
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    if (!ModelState.IsValid)
                    {
                        ModelState.AddModelError("mse", string.Format("Ensure that you have entered data into the fields"));
                        return PartialView(loginView);
                    }
                    var applicationUser = vidosaContext.Users.Where(u => u.Email == loginView.Username).FirstOrDefault();
                    if (!(applicationUser is null) && !applicationUser.EmailConfirmed)
                    {
                        ModelState.AddModelError("emc", "The Email was not confirmed or the user does not exists!");
                        return PartialView(loginView);
                    }
                    var result = await SignInManager.PasswordSignInAsync(loginView.Username, loginView.Password, loginView.RememberMe, shouldLockout: false);
                    switch (result)
                    {
                        case SignInStatus.Success:
                            return RedirectToLocal(ReturnUrl);
                        case SignInStatus.LockedOut:
                            return View("Lockout");
                        case SignInStatus.RequiresVerification:
                            return RedirectToAction("SendCode", new { ReturnUrl = ReturnUrl, RememberMe = loginView.RememberMe });
                        case SignInStatus.Failure:
                        default:
                            ModelState.AddModelError("eli0", "Invalid login attempt.");
                            ModelState.AddModelError("eli1", string.Format("Please check your password or username"));
                            return PartialView(loginView);
                    }
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("wronguser", "This Email may not be existing, Please make sure you created an Account.");
                    return PartialView(loginView);
                }
            }
        }

        private ActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                var oldReturnUrl = returnUrl.Split('?')[1];
                var newReturnUrl = string.Empty;
                string[] variables = oldReturnUrl.Split('&');

                for (int i = 0; i < variables.Length; i++)
                {
                    if (variables[i].Split('=')[0].Equals("ispartial"))
                    {
                        newReturnUrl += i <= 0 ? string.Format("ispartial={0}", true) : string.Format("&ispartial={0}", true);
                    }
                    else
                    {
                        newReturnUrl += i <= 0 ? string.Format("{0}={1}", variables[i].Split('=')[0], variables[i].Split('=')[1]) :
                            string.Format("&{0}={1}", variables[i].Split('=')[0], variables[i].Split('=')[1]);
                    }
                }
                string _returnUrl = returnUrl.Split('?')[1].Replace(returnUrl.Split('?')[1], newReturnUrl);
                return Redirect(string.Format("{0}?{1}", returnUrl.Split('?')[0], _returnUrl));
            }
            RouteValueDictionary valuePairs = new RouteValueDictionary();
            valuePairs.Add("ispartial", true);
            return RedirectToAction("Index", "Home", valuePairs);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult> ActivationAccount(string sts)
        {
            using (VidosaContext Context = new VidosaContext())
            {
                var userAccount = UserManager.FindById(
                    (from u in Context.Users where u.SecurityStamp == sts select u).FirstOrDefault() is null ? "" :
                    (from u in Context.Users where u.SecurityStamp == sts select u).FirstOrDefault().Id);

                LoginView loginView = new LoginView();
                loginView.Password = string.Format("");
                loginView.RememberMe = false;

                try
                {
                    if (!(userAccount is null))
                    {
                        IdentityResult identityResult = null;
                       
                        if (DateTime.Now.Hour - userAccount.AccCrtDate.Hour <= 1)
                        {
                            identityResult = UserManager.UpdateSecurityStamp(userAccount.Id);
                            if (identityResult.Succeeded)
                            {
                                userAccount.EmailConfirmed = true;
                                await UserManager.UpdateAsync(userAccount);
                                await SignInManager.SignInAsync(userAccount, false, false);
                            }                            
                            loginView.Password = string.Format("");
                            loginView.RememberMe = false;
                            loginView.Username = userAccount.Email;

                            return View("Login", loginView);
                        }
                        else
                        {
                            string oldLink = Request.Url.AbsolutePath;
                            string erroMessage = string.Format("The link below has expired we have sent you a new one, please use it within an hour to activate your account");
                            erroMessage += string.Format("\n{0}", string.Format("<a href='{0}'>{1}</a><br/>", oldLink, oldLink));

                            identityResult = UserManager.UpdateSecurityStamp(userAccount.Id);
                            if (identityResult.Succeeded)
                            {
                                // Query the database just make sure we have a new updated SecurityStamp
                                userAccount = UserManager.FindById(userAccount.Id);
                            }
                            await VerificationEmail(userAccount.Email, userAccount.SecurityStamp);
                            ModelState.AddModelError("aleExpired", erroMessage);
                            loginView.Password = string.Format("");
                            loginView.Username = userAccount.Email;
                            loginView.RememberMe = false;

                            return View("Login", loginView);
                        }
                    }
                    else
                    {
                        // Run this part of the code if the user needs to create an account.
                        loginView.Username = string.Format("");
                        ModelState.AddModelError("accnull", "The Account was not found or the confirmation link is old, Please login or create an account");
                        return View("Login", loginView);
                    }
                }
                catch (SmtpException smtpException)
                {
                    loginView.Username = string.Format("");
                    ModelState.AddModelError("accemail", "The email might not be existing, Ensure that the email exists");
                    return View("Login", loginView);
                }
                catch (Exception ex)
                {
                    loginView.Username = string.Format("");
                    ModelState.AddModelError("accgen", string.Format("Some other error experienced, {0}", ex.Message));
                    return View("Login", loginView);
                }
            }            
        }

        [HttpPost]        
        [AllowAnonymous]
        public async Task<ActionResult> UpdateUser(ExternalLoginConfirmationViewModel registrationView, string returnUrl)
        {
            try
            {
                ApplicationUser applicationUser = await UserManager.FindByEmailAsync(registrationView.Username);
                if (applicationUser is null)
                {
                    return View();
                }

                applicationUser.FirstName = registrationView.FirstName;
                applicationUser.LastName = registrationView.LastName;

                var updateResult = await UserManager.UpdateAsync(applicationUser);
                if (updateResult.Succeeded)
                {
                    var passwordUpdate = await UserManager.AddPasswordAsync(applicationUser.Id, registrationView.Password);
                    return RedirectToLocal(returnUrl);
                }
                else
                {
                    ModelState.AddModelError("userUpdate", "Something went wrong when updating");
                    return RedirectToLocal(returnUrl);
                }
            }
            catch (Exception)
            {
                // To be updated to return an error page
                return View();
            }           
        }

        // GET: /Account/ExternalLogin
        [HttpGet]
        [AllowAnonymous]
        public ActionResult ExternalLogin(string provider, string ReturnUrl)
        {
            // Request a redirect to the external login provider
            return new ChallengeResult(provider, Url.Action("ExternalLoginCallback", "Account", new { ReturnUrl }));
        }

        // Email already exist action
        [AllowAnonymous]
        public ActionResult EmailAlreadyExist()
        {
            ExternalLoginConfirmationViewModel model = new ExternalLoginConfirmationViewModel
            { Email = "smonaila@gmail.com", Username = "smonaila@gmail.com" };
            return View(model);
        }

        [AllowAnonymous]
        public async Task<ActionResult> ExternalLoginCallback(string ReturnUrl)
        {
            var loginInfo = await AuthenticationManager.GetExternalLoginInfoAsync();
            var appUser = UserManager.FindByEmail(loginInfo is null ? "" : loginInfo.Email);

            // Get the array of claims for this user
            Claim[] claims = loginInfo.ExternalIdentity.Claims.ToArray();

            // Create route value pairs to pass when redirecting
            RouteValueDictionary valuePairs = new RouteValueDictionary();

            if (!(appUser is null))
            {                
                List<UserLoginInfo> userLogins = (List<UserLoginInfo>)UserManager.GetLogins(appUser.Id);
                if (userLogins.Exists(ui => ui.LoginProvider == loginInfo.Login.LoginProvider))
                {
                    // Sign in the user with this external login provider if the user already has a login
                    var result = await SignInManager.ExternalSignInAsync(loginInfo, isPersistent: false);                    
                    switch (result)
                    {                        
                        case SignInStatus.Success:
                            valuePairs.Add("email", loginInfo.Email);
                            return RedirectToAction("Index", "Home", valuePairs);
                        case SignInStatus.LockedOut:
                            return View("Lockout");
                        case SignInStatus.RequiresVerification:
                            return RedirectToAction("SendCode", new { ReturnUrl, RememberMe = false });
                        case SignInStatus.Failure:
                        default:
                            if (appUser != null)
                            {
                                valuePairs.Add("email", loginInfo.Email);
                                return RedirectToAction("EmailAlreadyExist", "Account", valuePairs);
                            }                            
                            return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = loginInfo.Email, Username = loginInfo.Email });
                    }
                }
                else
                {
                    for (int i = 0; i < claims.Length; i++)
                    {
                        await UserManager.AddClaimAsync(appUser.Id, new Claim(claims[i].Type, claims[i].Value));
                    }
                    UserManager.AddLogin(appUser.Id, loginInfo.Login);
                    
                    // Sign in the user with this external login provider if the user already has a login
                    var result = await SignInManager.ExternalSignInAsync(loginInfo, isPersistent: false);
                    switch (result)
                    {
                        case SignInStatus.Success:
                            valuePairs.Add("email", loginInfo.Email);
                            return RedirectToAction("Index", "Home", valuePairs);
                        case SignInStatus.LockedOut:
                            return View();                            
                        case SignInStatus.RequiresVerification:
                            return View();
                        case SignInStatus.Failure:
                            return View();
                        default:
                            break;
                    }
                    return View();
                }
            }
            else
            {                
                ApplicationUser applicationUser = new ApplicationUser()
                {
                    Email = loginInfo.Email,
                    UserName = loginInfo.Email,
                    AccCrtDate = DateTime.Now
                };

                var userResult = await UserManager.CreateAsync(applicationUser);
                if (userResult.Succeeded)
                {                    
                    for (int i = 0; i < claims.Length; i++)
                    {
                        await UserManager.AddClaimAsync(applicationUser.Id, new Claim(claims[i].Type, claims[i].Value));
                        if (loginInfo.Login.LoginProvider.Equals("Google") && claims[i].Type.Contains("givenname"))
                        {
                            applicationUser.FirstName = claims[i].Value;                            
                        }
                        if (loginInfo.Login.LoginProvider.Equals("Google") && claims[i].Type.Contains("surname"))
                        {
                            applicationUser.LastName = claims[i].Value;
                        }

                        if (loginInfo.Login.LoginProvider.Equals("Facebook") && claims[i].Type.Equals("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"))
                        {
                            if (claims[i].Value.Split(' ').Length > 2)
                            {
                                applicationUser.FirstName = string.Format("{0} {1}", claims[i].Value.Split(' ')[0], claims[i].Value.Split(' ')[1]);
                                applicationUser.LastName = string.Format("{0}", claims[i].Value.Split(' ')[claims[i].Value.Split(' ').Length - 1]);
                            }
                        }
                    }
                    applicationUser.EmailConfirmed = true;
                    await UserManager.UpdateAsync(applicationUser);
                }
                else
                {
                    // There was an error creating this user

                }
                UserManager.AddLogin(applicationUser.Id, loginInfo.Login);

                ModelState.AddModelError("elc0", string.Format("You have been successfully loged in using your {0} account", loginInfo.Login.LoginProvider));
                ModelState.AddModelError("elc1", string.Format("We however recommend that you create an account for a proper communication with you"));
                ModelState.AddModelError("elc2", string.Format("Create a password and click update"));

                return View("CreateAccount", new RegistrationView() { Email = loginInfo.Email, LastName = applicationUser.LastName, FirstName = applicationUser.FirstName });
            }            
        }
        #region Helpers

        // Used for XSRF protection when adding external logins
        private const string XsrfKey = "XsrfId";

        internal class ChallengeResult : HttpUnauthorizedResult
        {
            public ChallengeResult(string provider, string ReturnUrl)
                : this(provider, ReturnUrl, null)
            {
            }

            public ChallengeResult(string provider, string ReturnUrl, string userId)
            {
                LoginProvider = provider;
                this.ReturnUrl = ReturnUrl;
                UserId = userId;
            }

            public string LoginProvider { get; set; }
            public string ReturnUrl { get; set; }
            public string UserId { get; set; }

            public override void ExecuteResult(ControllerContext context)
            {
                var properties = new AuthenticationProperties { RedirectUri = ReturnUrl };
                if (UserId != null)
                {
                    properties.Dictionary[XsrfKey] = UserId;
                }
                context.HttpContext.GetOwinContext().Authentication.Challenge(properties, LoginProvider);
            }
        }
        #endregion

        private IAuthenticationManager AuthenticationManager
        {
            get
            {
                return HttpContext.GetOwinContext().Authentication;
            }
        }

        public ActionResult LogOut()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                RouteValueDictionary valuePairs = new RouteValueDictionary();
                valuePairs.Add("email", User.Identity.Name);
                valuePairs.Add("ispartial", true);

                AuthenticationManager.SignOut(DefaultAuthenticationTypes.ApplicationCookie);
                return RedirectToAction("login", "Account", valuePairs); 
            }
        }
    }
}