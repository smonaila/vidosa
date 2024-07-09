using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using vidosa.Areas.admin.Models;
using vidosa.Models;
using System.Data.Entity;
using System.Web.Routing;
using Microsoft.AspNet.Identity;

namespace vidosa.Areas.admin.Controllers
{
    [Authorize(Users = "smonaila@hotmail.com")]
    public class HomeController : Controller
    {
        // /admin/Home/DeletePost?purl={0}&IsDeleted={1}
        public ActionResult DeletePost(string purl, bool IsDeleted)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    var Post = (from p in vidosaContext.Posts
                                where p.PostUrl == purl
                                select p).FirstOrDefault();

                    if (Post != null)
                    {
                        Post.IsDeleted = IsDeleted;
                    }
                    vidosaContext.Entry(Post).State = EntityState.Modified;
                    vidosaContext.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                throw;
            }
            return RedirectToAction("Index", "Home");
        }

        public ActionResult GetChapters()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);

                    string SubjectId = Request.QueryString["subjectId"];

                    List<Post> Posts = (from p in vidosaContext.Posts
                                        where p.UserId == applicationUser.Id
                                        select p).ToList();

                    List<Chapter> chapters = (from c in vidosaContext.Chapters
                                              where c.SubjectId == SubjectId
                                              select c).ToList();

                    List<Post> FilteredPosts = Posts.FindAll(p => !chapters.Exists(c => c.PostKey == p.PostKey));
                    ViewBag.SubjectId = SubjectId;
                    ViewBag.Chapters = chapters;
                    ViewBag.Subjects = (from s in vidosaContext.Subjects select s).ToList();

                    string temp_chapters = string.Empty;
                    for (int i = 0; i < chapters.Count; i++)
                    {
                        temp_chapters += i < chapters.Count - 1 ? string.Format("{0}-", chapters[i].PostKey) : string.Format("{0}", chapters[i].PostKey);
                    }
                    ViewBag.chapterQS = temp_chapters;
                    return View(FilteredPosts);
                }
                catch (Exception)
                {
                    throw;
                }
            }            
        }

        public ActionResult ChaptersToRemove()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);

                    string SubjectId = Request.QueryString["subjectId"];

                    List<Post> Posts = (from p in vidosaContext.Posts
                                        where p.UserId == applicationUser.Id
                                        select p).ToList();

                    List<Chapter> chapters = (from c in vidosaContext.Chapters
                                              where c.SubjectId == SubjectId
                                              select c).ToList();

                    List<Post> FilteredPosts = (from p in vidosaContext.Posts.ToList()
                                                from c in chapters
                                                where p.PostKey == c.PostKey
                                                select p).ToList();

                    ViewBag.SubjectId = SubjectId;
                    ViewBag.Chapters = chapters;
                    ViewBag.Subjects = (from s in vidosaContext.Subjects select s).ToList();

                    string temp_chapters = string.Empty;
                    for (int i = 0; i < chapters.Count; i++)
                    {
                        temp_chapters += i < chapters.Count - 1 ? string.Format("{0}-", chapters[i].PostKey) : string.Format("{0}", chapters[i].PostKey);
                    }
                    ViewBag.chapterQS = temp_chapters;
                    return View("GetChapters", FilteredPosts);
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        public ActionResult RemoveChapters()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    string chapters = Request.QueryString["scs"];
                    string subjectId = Request.QueryString["subjectId"];

                    string[] postKeys = chapters.Split(';');

                    for (int i = 0; i < postKeys.Length; i++)
                    {
                        vidosaContext.Entry(vidosaContext.Chapters.ToList().Find(c => c.PostKey == postKeys[i] && c.SubjectId == subjectId)).State = EntityState.Deleted;
                        vidosaContext.SaveChanges();
                    }
                    RouteValueDictionary valuePairs = new RouteValueDictionary();
                    valuePairs.Add("subjectId", subjectId);
                    return RedirectToAction("ChaptersToRemove", valuePairs);
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        public ActionResult AddChapters()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    string chapters = Request.QueryString["scs"];
                    string subjectId = Request.QueryString["subjectId"];
                    List<Chapter> oldChapters = vidosaContext.Chapters.ToList().Where(c => c.SubjectId == subjectId).ToList();

                    string[] postKeys = chapters.Split(';');           

                    for (int i = 0; i < postKeys.Length; i++)
                    {
                        vidosaContext.Chapters.Add(new Chapter() { PostKey = postKeys[i], SubjectId = subjectId });
                        vidosaContext.SaveChanges();
                    }
                    RouteValueDictionary valuePairs = new RouteValueDictionary();
                    valuePairs.Add("subjectId", subjectId);
                    return RedirectToAction("GetChapters", valuePairs);
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        public ActionResult AddSubject()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);
                    List<Subject> subjects = (from s in vidosaContext.Subjects
                                              where s.UserId == applicationUser.Id
                                             select s).ToList();

                    ViewBag.Subjects = subjects;
                    return View();
                }
                catch (Exception)
                {
                    return View();
                } 
            }
        }

        public ActionResult CreateSubject()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);
                    string SubjectName = Request.Form["name"];
                    string SubjectDescription = Request.Form["description"];

                    vidosaContext.Subjects.Add(new Subject() { Name = SubjectName, SubjectId = Guid.NewGuid().ToString().Replace("-", ""), Description = SubjectDescription, UserId =  applicationUser.Id });
                    vidosaContext.SaveChanges();
                    List<Subject> subjects = (from s in vidosaContext.Subjects
                                              where s.UserId == applicationUser.Id
                                              select s).ToList();

                    ViewBag.Subjects = subjects;

                    return View(subjects);
                }
            }
            catch (Exception)
            {
                throw;
            }
            
        }

        // GET: admin/Home
        public ActionResult Index()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = (from u in vidosaContext.Users
                                                       where u.Email == User.Identity.Name
                                                       select u).FirstOrDefault();

                    List<Log> Logs = new List<Log>();
                    List<Post> Posts = (from p in vidosaContext.Posts
                                 where p.UserId == applicationUser.Id
                                 select p).ToList();
                    List<Video> Videos = (from v in vidosaContext.Videos
                                          where v.UserId == applicationUser.Id
                                          select v).ToList();

                    for (int i = 0; i < Posts.Count; i++)
                    {
                        Logs.Add(new Log()
                        {
                            DateCreated = Posts[i].PusblishedDate,
                            DateUpdated = Posts[i].DateUpdated,
                            Description = Posts[i].Blurb,
                            Id = Posts[i].Id,
                            Title = Posts[i].Title,
                            UrlId = Posts[i].PostUrl,
                            IsPost = true,
                            IsDeleted = Posts[i].IsDeleted
                        });
                    }

                    for (int i = 0; i < Videos.Count; i++)
                    {
                        Logs.Add(new Log()
                        {
                            DateCreated = Videos[i].DatePublished,
                            DateUpdated = Videos[i].DatePublished,
                            Description = Videos[i].Description,
                            Id = Videos[i].Id,
                            Title = Videos[i].Title,
                            UrlId = Videos[i].VideoId,
                            IsPost = false
                        });
                    }

                    Logs.OrderByDescending(L => L.DateCreated);

                    int totalNumberOfPages = (int)(Math.Floor((decimal)(Logs.Count / 10))) +
                    (Logs.Count % 10 >= 1 ? 1 : 0);

                    int currentPage = 1;                    

                    currentPage = currentPage < 0 ? totalNumberOfPages : currentPage;

                    int skipCounter = Logs.Count() <= 10 ?
                    0 : (currentPage - 1) * 10;

                    int takeCounter = Logs.Skip(skipCounter).Count() >= 10 ? 10 : Logs.Skip(skipCounter).Count();

                    List<Log> filteredLogs = Logs.OrderByDescending(p => p.DateUpdated)
                                               .Skip(skipCounter)
                                               .Take(takeCounter)
                                               .ToList();

                    ViewBag.totalNumberOfPages = totalNumberOfPages;
                    return View(filteredLogs);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        //GET: Form to Add a Redirect
        public ActionResult AddRedirect()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);
                    List<Redirect> Redirects = (from r in vidosaContext.Redirects
                                                where r.UserId == applicationUser.Id select r).ToList();
                    return View(Redirects);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        //POST: SaveRedirect
        public ActionResult SaveRedirect()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Redirect redirect = new Redirect();
                    string oldUrl = Request.Form["oldUrl"].Split('?')[1];
                    string newUrl = Request.Form["newUrl"].Split('?')[1];

                    string[] urlVariables = oldUrl.Split('&');
                    string[] newUrlVariable = newUrl.Split('&');

                    ApplicationUser applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);

                    bool IsPost = Request.Form["ispost"] is null ? false : true;

                    redirect.UserId = applicationUser.Id;
                    redirect.OldUrlId = IsPost ? urlVariables.ToList().Find(v => v.Split('=')[0].Equals("purl")).Split('=')[1] : urlVariables.ToList().Find(v => v.Split('=')[0].Equals("v")).Split('=')[1];

                    if (!(vidosaContext.Redirects.ToList().Exists(r => r.OldUrlId == redirect.OldUrlId)))
                    {
                        redirect.UrlIdFrom = Request.Form["oldUrl"];
                        redirect.UrlIdTo = Request.Form["newUrl"];
                        redirect.DateCreated = DateTime.Now;
                        redirect.NewUrlId = IsPost ? newUrlVariable.ToList().Find(v => v.Split('=')[0].Equals("purl")).Split('=')[1] : newUrlVariable.ToList().Find(v => v.Split('=')[0].Equals("v")).Split('=')[1];

                        if ((vidosaContext.Redirects.ToList().Exists(r => r.OldUrlId == redirect.NewUrlId)))
                        {
                            redirect.UrlIdTo = (from r in vidosaContext.Redirects
                                                where r.OldUrlId == redirect.NewUrlId
                                                select r).FirstOrDefault().UrlIdTo;
                            redirect.NewUrlId = (from r in vidosaContext.Redirects
                                                 where r.OldUrlId == redirect.NewUrlId
                                                 select r).FirstOrDefault().NewUrlId;

                            ModelState.AddModelError("url-removed", string.Format("Please Note that you are Redirecting to an Url that you have redirected From. {0}", redirect.UrlIdTo));
                        }
                        redirect.DateModified = DateTime.Now;
                        vidosaContext.Redirects.Add(redirect);
                        vidosaContext.SaveChanges();
                    }
                    else
                    {
                        ModelState.AddModelError("url", "Url Redirect Already Exist, Cannot Redirect to Multiple Url");
                    }
                    List<Redirect> Redirects = (from r in vidosaContext.Redirects
                                                 where r.UserId == applicationUser.Id
                                                 select r).ToList();

                    Redirects.OrderByDescending(r => r.DateCreated);

                    return PartialView(Redirects);
                }
            }
            catch (Exception)
            {
                throw;
            }
            
        }
        // GET: Post Pager
        public ActionResult GetNextPage()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                List<Post> Posts = vidosaContext.Posts.ToList()
                                .OrderByDescending(p => p.DateUpdated)
                                .ToList();
                List<Video> Videos = vidosaContext.Videos.ToList()
                                     .OrderByDescending(v => v.DatePublished)
                                     .ToList();

                List<Log> Logs = new List<Log>();

                for (int i = 0; i < Posts.Count; i++)
                {
                    Logs.Add(new Log()
                    {
                        DateCreated = Posts[i].PusblishedDate,
                        DateUpdated = Posts[i].DateUpdated,
                        Description = Posts[i].Content,
                        Id = Posts[i].Id,
                        IsDeleted = Posts[i].IsDeleted,
                        IsPost = true,
                        Title = Posts[i].Title,
                        UrlId = Posts[i].PostUrl
                    });
                }

                for (int i = 0; i < Videos.Count; i++)
                {
                    Logs.Add(new Log()
                    {
                        DateCreated = Videos[i].DatePublished,
                        DateUpdated = Videos[i].DatePublished,
                        Description = Videos[i].Description,
                        Id = Videos[i].Id,
                        IsDeleted = false,
                        IsPost = false,
                        Title = Videos[i].Title,
                        UrlId = Videos[i].VideoId
                    });
                }

                if (Convert.ToInt16(Request.QueryString["bt"]) == 2)
                {
                    Logs.RemoveAll(log => log.IsPost == true);
                }

                if (Convert.ToInt16(Request.QueryString["bt"]) == 3)
                {
                    Logs.RemoveAll(log => log.IsPost == false);
                }

                Logs.OrderByDescending(log => log.DateUpdated);

                int totalNumberOfPages = (int)(Math.Floor((decimal)(Logs.Count / 10))) +
                    (Logs.Count % 10 >= 1 ? 1 : 0);

                int currentPage =
                    Convert.ToInt32(Request.QueryString["page"]) > totalNumberOfPages ? 1 : Convert.ToInt32(Request.QueryString["page"]);

                currentPage = currentPage < 0 ? totalNumberOfPages : currentPage;

                int skipCounter = Logs.Count() <= 10 ? 0 : (currentPage - 1) * 10;
                int takeCounter = Logs.Skip(skipCounter).Count() >= 10 ? 10 : Logs.Skip(skipCounter).Count();
                List<Log> filteredLogs = Logs.OrderByDescending(log => log.DateUpdated)
                                         .Skip(skipCounter)
                                         .Take(takeCounter)
                                         .ToList();

                ViewBag.prev = currentPage - 1 == 0 ? totalNumberOfPages : currentPage - 1;
                ViewBag.next = currentPage + 1 <
                    totalNumberOfPages ? currentPage + 1 : 1;

                return PartialView("tableposts", filteredLogs);
            }
        }


        // POST: Save Related Posts
        [HttpPost]
        public ActionResult SaveRelatedPosts()
        {
            var forms = Request.Form;
            var keys = Request.Form.ToString().Split('&');

            using (VidosaContext vidosaContext = new VidosaContext())
            {
                int pid = Convert.ToInt32(Request.QueryString["pid"].ToString());
                bool ispost = Convert.ToBoolean(Request.QueryString["ispost"]);
                
                List<RelatedPosts> relatedPosts = vidosaContext.RelatedPosts.Where(rp => rp.Identity == pid).ToList();               

                // Remove all the related content that is not on the current selection.
                if (ispost && relatedPosts.Count > 0 && relatedPosts.Exists(rp => rp.IsPost == true))
                {
                    List<RelatedPosts> toDelete = relatedPosts.Where(rp => rp.Identity == pid && rp.IsPost == true).ToList();
                    for (int i = 0; i < toDelete.Count; i++)
                    {
                        vidosaContext.Entry(toDelete[i]).State = EntityState.Deleted;
                    }                    
                }
                else if(!ispost && relatedPosts.Count > 0 && relatedPosts.Exists(rp => rp.IsPost == false))
                {
                    List<RelatedPosts> toDelete = relatedPosts.Where(rp => rp.Identity == pid && rp.IsPost == false).ToList();
                    for (int i = 0; i < toDelete.Count; i++)
                    {
                        vidosaContext.Entry(toDelete[i]).State = EntityState.Deleted;
                    }                    
                }
                vidosaContext.SaveChanges();

                foreach (string pk in forms)
                {
                    if (pk.Equals("X-Requested-With"))
                    {
                        continue;
                    }
                    if (ispost)
                    {
                        vidosaContext.RelatedPosts.Add(new RelatedPosts()
                        {
                            IsPost = true,
                            Key = pk,
                            Identity = pid
                        });
                    }
                    else
                    {
                        vidosaContext.RelatedPosts.Add(new RelatedPosts()
                        {
                            IsPost = false,
                            Key = pk,
                            Identity = pid
                        });
                    }                    
                }
                vidosaContext.SaveChanges();
            }
            
            return PartialView();
        }

        // GET: admin/home/getpost
        public ActionResult GetPost(string purl)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                string searchItem = Request.Form["searchby"];
                PostSEO postSEO = null;

                if (!(searchItem is null))
                {
                    if (searchItem.Equals("PostId"))
                    {
                        int postId = Convert.ToInt32(Request.Form["searchvalue"]);
                        postSEO = (from p in vidosaContext.PostSEOs
                                   where p.Id == postId
                                   select p).FirstOrDefault();
                    }
                    else if (searchItem.Equals("Url"))
                    {
                        string url = Request.Form["searchvalue"].ToString();
                        var post = (from po in vidosaContext.Posts
                                    where po.PostUrl == url
                                    select po).FirstOrDefault();

                        postSEO = (from p in vidosaContext.PostSEOs
                                   where p.PostKey == post.PostKey
                                   select p).FirstOrDefault();
                    }
                    else if (searchItem.Equals("Title"))
                    {
                        string title = Request.Form["searchvalue"].ToString();
                        postSEO = (from p in vidosaContext.PostSEOs
                                   where p.Title == title
                                   select p).FirstOrDefault();
                    }
                }
                else
                {
                    var post = (from po in vidosaContext.Posts
                                where po.PostUrl == purl
                                select po).FirstOrDefault();

                    postSEO = (from p in vidosaContext.PostSEOs
                               where p.PostKey == post.PostKey
                               select p).FirstOrDefault();
                }

                ViewBag.RelatedPosts = vidosaContext.RelatedPosts.Where(p => p.Identity == postSEO.Id && p.IsPost).ToList();
                ViewBag.Posts = vidosaContext.Posts.Where(p => p.PostKey != postSEO.PostKey).ToList();
                ViewBag.RelatedVideos = vidosaContext.RelatedPosts.Where(v => v.Identity == postSEO.Id && !v.IsPost).ToList();
                ViewBag.Videos = vidosaContext.Videos.ToList();
                ViewBag.Authors = (from p in vidosaContext.Posts where p.PostKey == postSEO.PostKey from u in vidosaContext.Users where u.Id == p.UserId select u).ToList();
                ViewBag.PostInf = new
                {
                    DateCreated = (from p in vidosaContext.Posts where p.PostKey == postSEO.PostKey select p).FirstOrDefault().PusblishedDate,
                    LastUpdated = (from p in vidosaContext.Posts where p.PostKey == postSEO.PostKey select p).FirstOrDefault().DateUpdated
                };

                PostSEOView postSEOView = new PostSEOView()
                {
                    Title = postSEO.Title,
                    HtmlCode = HttpUtility.HtmlDecode((from p in vidosaContext.Posts
                                                       where p.PostKey == postSEO.PostKey
                                                       select p).FirstOrDefault().Content),
                    Id = postSEO.Id,
                    PostKey = postSEO.PostKey,
                    Blurb = postSEO.Blurb,
                    Keywords = postSEO.Keywords,
                };
                return View(postSEOView);
            }            
        }

        // POST: Save PostSEOs changes
        [ValidateInput(false)]
        [HttpPost]
        public ActionResult SaveSEO(PostSEOView postSEOView)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                if (ModelState.IsValid)
                {
                    PostSEO postSEO = (from postSeo in vidosaContext.PostSEOs
                                       where postSeo.Id == postSEOView.Id
                                       select postSeo).FirstOrDefault();

                    Post post = (from p in vidosaContext.Posts
                                 where p.Id == postSEO.Id
                                 select p).FirstOrDefault();

                    post.Content = HttpUtility.HtmlEncode(postSEOView.HtmlCode);
                    post.Title = postSEOView.Title;
                    post.DateUpdated = DateTime.Now;
                    post.Blurb = postSEOView.Blurb;

                    postSEO.PostKey = post.PostKey;
                    postSEO.Keywords = postSEOView.Keywords;
                    postSEO.Id = postSEO.Id;
                    postSEO.Title = postSEOView.Title;
                    postSEO.Blurb = postSEOView.Blurb;

                    vidosaContext.Entry(postSEO).State = EntityState.Modified;
                    vidosaContext.Entry(post).State = EntityState.Modified;

                    vidosaContext.SaveChanges();
                }
                else
                {

                }
            }
            return View();
        }

        [HttpGet]
        public ActionResult Post()
        {
            return View();
        }

        // post: Create Post and SEO
        [HttpPost]
        [ValidateInput(false)]
        public ActionResult CreatePost(PostSEOView postSEOView)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                string[] characters = new string[] { " ", "-", "#", "." };
                string[] newcharacters = new string[] { };

                Post post = new Post()
                {
                    Blurb = postSEOView.Blurb,
                    Content = HttpUtility.HtmlEncode(postSEOView.HtmlCode),
                    DateUpdated = DateTime.Now,
                    PostUrl = postSEOView.Title.Replace(" ", "-").Replace("#", "csharp").Replace(".", "dot").ToLower(),
                    Title = postSEOView.Title,
                    PusblishedDate = DateTime.Now,
                    UserId = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name).Id,
                    ThumbUrl = string.Format("/images/blogs/{0}.jpg", postSEOView.Title.Replace(" ", "-").Replace("#", "csharp").ToLower()),
                    PostKey = Guid.NewGuid().ToString().Replace("-", ""),
                    IsDeleted = true
                };
                vidosaContext.Posts.Add(post);
                vidosaContext.SaveChanges();

                PostSEO postSEO = new PostSEO()
                {
                    Blurb = post.Blurb,
                    Keywords = postSEOView.Keywords,
                    Title = post.Title,
                    PostKey = post.PostKey                    
                };
                vidosaContext.PostSEOs.Add(postSEO);
                vidosaContext.SaveChanges();                
            }
            return View();
        }
    }
}