using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using System.Xml.Linq;
using vidosa.Models;
using System.IO.Ports;
using Microsoft.AspNet.Identity;
using System.Threading.Tasks;
using System.Data.Entity;
using FileIO = System.IO.File;
using System.Threading;

namespace vidosa.Controllers
{
    public class HomeController : Controller
    {
        //[OutputCache(CacheProfile = "HomePageProfile")]
        public ActionResult Index()
        {
            List<Video> Videos = new List<Video>();
            using (VidosaContext Context = new VidosaContext())
            {
                try
                {
                    Videos = Context.Videos.ToList();
                    var Details = Context.VideoDetails.ToList();

                    // Ensure that you check whether this an async request
                    ViewBag.IsAjax = Request.IsAjaxRequest();
                    ViewBag.Url = string.Format("/Home/Index?ispartial=false");

                    ////(from v in Details
                    //// where v.VideoId == video.VideoId
                    //// select v).FirstOrDefault().HtmlContent;

                    // foreach (Video video in Videos)
                    // {
                    //    video.VideoDetails = "HEllo There";
                    // }

                    if (User.Identity.IsAuthenticated && Context.PremiumSubs.ToList().Exists(pu => pu.Username == User.Identity.Name))
                    {
                        Videos = Context.Videos.ToList();
                        var applicationUser = Context.Users.Where(u => u.Email == User.Identity.Name).FirstOrDefault();
                        Context.SaveChanges();
                    }
                    else
                    {
                        Videos = (from vid in Context.Videos.ToList()
                                  where vid.IsSubscription == false
                                  select vid).ToList();
                    }                    
                    for (int i = 0; i < Videos.Count; i++)
                    {
                        Videos[i].Duration = GetDuration(Videos[i]);
                    }
                    string valuePairs = Request.QueryString["ispartial"];
                    bool IsPartial = Convert.ToBoolean(valuePairs);
                    IEnumerable<Video> OrderedVideos = Videos.OrderByDescending(v => v.DatePublished).ToList();

                    // SEO related information
                    ViewBag.Title = "Vidosa - Programming Tutorials";
                    ViewBag.Keywords = "Programming, C#, Streaming, Coding, Education";
                    ViewBag.Metadata = "Programming, C#, Streaming, Coding, Education";

                    return View(OrderedVideos);
                }
                catch (Exception exception)
                {
                    throw exception;
                }
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
                    var mpdFilePath = Server.MapPath(string.Format(@"{0}", video.Path));
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
                    var adaptationSet = (from adpSet in
                                             xDocument.Descendants(xNamespace + "AdaptationSet")
                                         select adpSet).FirstOrDefault();
                    video.Height = Convert.ToInt32(adaptationSet.Attribute("maxHeight").Value);

                    if (Hour > 1)
                    {
                        duration = string.Format("{0}:{1}:{2}", strHour, strMin, strSec);
                    }
                    else
                    {
                        duration = string.Format("{0}:{1}", strMin, strSec);
                    }
                }
                return duration;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";
            ViewBag.Title = "Vidosa - Information about the website";
            ViewBag.Author = "Monaila Kgotliso";
            ViewBag.Description = "We provide streaming services, education content, entertainment content";

            if (Utility.IsCrawlbot(Request) || Request.QueryString.Count == 0)
            {
                return View();
            }
            return PartialView();
        }

        [HttpGet]
        public ActionResult Contact()
        {

            if (Utility.IsCrawlbot(Request) || Request.QueryString.Count == 0)
            {
                return View();
            }
            return PartialView();
        }

        [HttpPost]
        public async Task<ActionResult> RequestContact(ContactView contactView)
        {
            ViewBag.Message = "Your contact page.";
            try
            {
                if (ModelState.IsValid)
                {
                    using (VidosaContext vidosaContext = new VidosaContext())
                    {
                        string firstName = Request.Form["firstName"];
                        string email = Request.Form["email"];
                        string message = Request.Form["message-area"];

                        EmailList emailSub = (from e in vidosaContext.Emails
                                              where e.EmailAddress == email
                                              select e).FirstOrDefault();

                        if (emailSub is null)
                        {
                            emailSub = new EmailList();
                            emailSub.SubDate = DateTime.Now;
                            emailSub.FirstName = firstName;
                            emailSub.IsActive = false;
                            emailSub.IpAddress = Request.ServerVariables["REMOTE_ADDR"];
                            emailSub.ActivationCode = Guid.NewGuid().ToString();
                            emailSub.EmailAddress = email;

                            vidosaContext.Entry(emailSub).State = EntityState.Added;
                            vidosaContext.SaveChanges();

                            EmailService emailService = new EmailService();

                            IdentityMessage identityMessage = new IdentityMessage();
                            identityMessage.Subject = "Email Confirmation";
                            identityMessage.Destination = string.Format("{0}", email);
                            identityMessage.Body = string.Format("<b />Please confirm that this email belongs to you by clicking or copying and pasting the following url to your browser address bar. We will only contact you after the email is confirmed to be belonging to you.<b /><a>https://www.vidosa.co.za/account/activateemail?ac={0}</a>", emailSub.ActivationCode);

                            await emailService.SendAsync(identityMessage);
                            ModelState.AddModelError("cm", string.Format("Hi {0}, Thank you for contacting us, we have sent you an email to {1}. Please check the email and follow the instructions on it.", emailSub.FirstName, emailSub.EmailAddress));

                            identityMessage.Subject = "User Requested a Contact";
                            identityMessage.Destination = "smonaila@hotmail.com";
                            identityMessage.Body = string.Format("Hi admin the user ({0} at {1}) have requested a contact as follows<br /> {2}", emailSub.FirstName, emailSub.EmailAddress, message);

                            // Send email to the admin
                            await emailService.SendAsync(identityMessage);

                            return PartialView("Contact", new { emailSub.FirstName, Email = emailSub.EmailAddress, Message = message });
                        }
                        else
                        {
                            // If this email already exists
                            if (emailSub.IsActive)
                            {
                                // The email is active (eam => email active message)
                                ModelState.AddModelError("eam", string.Format("Hi {0}, Thank you for contacting us, we have received your message we will keep in touch.", emailSub.FirstName));
                                return PartialView("Contact", new { emailSub.FirstName, Email = emailSub.EmailAddress, Message = message });
                            }
                            else
                            {
                                emailSub.ActivationCode = Guid.NewGuid().ToString();
                                emailSub.FirstName = firstName;
                                vidosaContext.Entry(emailSub).State = EntityState.Modified;
                                vidosaContext.SaveChanges();

                                EmailService emailService = new EmailService();
                                IdentityMessage identityMessage = new IdentityMessage();

                                identityMessage.Subject = "User Requested a Contact";
                                identityMessage.Destination = "smonaila@hotmail.com";
                                identityMessage.Body = string.Format("<b />Please confirm that this email belongs to you by clicking or copying and pasting the following url to your browser address bar. We will only contact you after the email is confirmed to be belonging to you.<b /><a>https://www.vidosa.co.za/account/activateemail?ac={0}</a>", emailSub.ActivationCode);

                                // Asynchronously send the email
                                await emailService.SendAsync(identityMessage);

                                // This email is in active, resend the link for activation (enam => email not active message)
                                ModelState.AddModelError("enam", string.Format("Hi {0}, We picked up that your email already exists. You need to confirm that the email belongs to you by following the instructions we have sent to {1} or your message will never make it to our team. ", emailSub.FirstName, emailSub.EmailAddress));

                                return PartialView("Contact", new { emailSub.FirstName, Email = emailSub.EmailAddress, Message = message });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {

            }
            return PartialView("Contact", contactView);
        }

        public ActionResult Articles()
        {
            ViewBag.Metadata = "System,Console,console Application,signature,Main method,compiler";
            return View();
        }

        public ActionResult UpdateCommentsDate()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                List<Comment> comments = (from c in vidosaContext.Comments
                                          where c.IsReply == false
                                          select c).ToList();

                for (int i = 0; i < comments.Count; i++)
                {
                    comments[i].DateTime = RandomDate();
                    vidosaContext.Entry(comments[i]).State = EntityState.Modified;
                    vidosaContext.SaveChanges();
                    Thread.Sleep(100);
                }
                return View();
            }
        }

        private DateTime RandomDate()
        {
            Random random = new Random();
            DateTime start = new DateTime(2018, 1, 1, DateTime.Now.Hour, DateTime.Now.Minute, DateTime.Now.Second, DateTime.Now.Millisecond);
            DateTime end = new DateTime(2019, 01, 18, 3, 35, 56);
            int range = (end - start).Days;
            return start.AddDays(random.Next(range));
        }

        public ActionResult UpdatePostKeys()
        {

            //using (VidosaContext vidosa = new VidosaContext())
            //{
            //    List<Post> posts = vidosa.Posts.ToList();
            //    for (int i = 0; i < posts.Count; i++)
            //    {
            //        posts[i].UserId = "b9b6003c-2ed0-4565-b63b-b4b643665a58";
            //        vidosa.Entry(posts[i]).State = EntityState.Modified;
            //    }
            //    vidosa.SaveChanges();
            //}

            string fileOpener = Server.MapPath(string.Format(@"/DataFiles/postSEoKeys.txt"));
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                // List<Post> posts = vidosaContext.Posts.ToList();
                // for (int i = 0; i < posts.Count; i++)
                // {
                //    PostSEO post = vidosaContext.PostSEOs.ToList().Find(p => p.Id == posts[i].Id);
                //    post.PostKey = posts[i].PostKey;
                //    vidosaContext.Entry(post).State = EntityState.Modified;
                // }
                // vidosaContext.SaveChanges();

                List<Video> videos = vidosaContext.Videos.ToList();
                string[] files = Directory.GetFiles(@"C:\Users\Administrator\source\repos\vidosa\vidosa\videos\thumbs", "*.*");
                FileInfo[] ImageFiles = new FileInfo[files.Length];

                for (int i = 0; i < files.Length; i++)
                {
                    ImageFiles[i] = new FileInfo(files[i]);
                }

                for (int i = 0; i < videos.Count; i++)
                {
                    Random random = new Random(0);
                    int index = random.Next(ImageFiles.Length);
                    FileInfo myFile = ImageFiles[index];

                    string fileName = string.Format("{0}", myFile.Name);

                    FileStream Sourcestream = System.IO.File.Open(myFile.FullName, FileMode.Open, FileAccess.ReadWrite);
                    byte[] Buffer = new byte[ImageFiles[index].Length];
                    Sourcestream.Read(Buffer, 0, Buffer.Length);
                    Sourcestream.Close();
                    

                    FileStream DestStream = System.IO.File.Open(Server.MapPath(string.Format("/videos/thumbs/{0}{1}", videos[i].VideoId, myFile.Extension)), FileMode.OpenOrCreate, FileAccess.ReadWrite);                    

                    DestStream.Write(Buffer, 0, Buffer.Length);
                    DestStream.Close();                    
                }
            }
            return View();
        }
    }
}