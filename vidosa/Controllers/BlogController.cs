using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Mvc;
using vidosa.Models;
using MvcAuthorize = System.Web.Mvc.AuthorizeAttribute;

namespace vidosa.Controllers
{
    public class BlogController : Controller
    {
        // GET: Blog
        public ActionResult Index()
        {
            return View();
        }

        public JsonResult GetUserPost(string searchTerm)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    SearchResults searchResults = new SearchResults();
                    List<SearchResults> videos = searchResults.GetSearchResults(Request).OrderByDescending(s => s.Date).ToList();

                    var results = (from search in videos
                                   select new
                                   {
                                       Title = search.Title.ToLower(),
                                       Username = string.Format("{0} {1}",
                                       vidosaContext.Users.ToList().Find(u => u.Id == search.UserId).LastName,
                                       vidosaContext.Users.ToList().Find(u => u.Id == search.UserId).FirstName),
                                       Type = search.IsPost == true ? "blog" : "vlog",
                                       search.UrlId
                                   }).ToList();

                    return Json(results, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // Get: Related Post
        public ActionResult GetRelatedPost()
        {
            List<RelatedPosts> relatedPosts = new List<RelatedPosts>();
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    relatedPosts = vidosaContext.RelatedPosts.ToList();
                }
            }
            catch (Exception)
            {

            }
            return PartialView(relatedPosts);
        }

        public ActionResult GetReplies(string commentId, string page)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    List<Comment> comments = vidosaContext.Comments.ToList();
                    List<CommentReply> commentReplies = vidosaContext.CommentReplies.Where(cr => cr.ParentId == commentId).OrderBy(cr => cr.CommentDate).ToList();
                    
                    List<Reactions> CommentReactions = vidosaContext.Reactions.Where(r => r.ContentType == ContentType.Comment).ToList();

                    int totalPages = (int)Math.Floor((decimal)(commentReplies.Count / 3)) +
                   (commentReplies.Count % 3 >= 1 ? 1 : 0);

                    int currentPage =
                        Convert.ToInt32(page) > totalPages ? 1 : Convert.ToInt32(page);

                    currentPage = currentPage < 0 ? totalPages : currentPage;

                    int skipCounter = commentReplies.Count() <= 3 ?
                        0 : (currentPage - 1) * 3;

                    List<CommentReply> takeReplies = commentReplies.Skip(skipCounter).Take(3).ToList();

                    ViewBag.CommentReactions = CommentReactions;
                    ViewBag.ParentId = commentId;
                    ViewBag.Comments = comments;
                    ViewBag.ReplyPage = currentPage + 1;

                    return PartialView(takeReplies);
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        public ActionResult _GetComments(int ct, string key, string page)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {

                    return PartialView(); 
                }
            }
            catch (Exception)
            {

                throw;
            }
        }

        public ActionResult PrintComments(int ct, string key, string page)
        {
            try
            {
                List<Comment> comments = new List<Comment>();
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    comments = vidosaContext.Comments.Count() > 0 ? vidosaContext.Comments.Where(c => 
                    c.CommentType == (CommentType)ct && c.CommentKey == key).ToList() :
                        new List<Comment>();

                    var MainComments = comments.Where(c => c.IsReply == false).ToList();

                    ViewBag.CommentKey = key;
                    ViewBag.CommentType = ct;
                    ViewBag.CommentCounter = comments.Count > 1 ? string.Format("{0} Comments", comments.Count) : string.Format("{0} Comment", comments.Count);

                    List<Reactions> CommentReactions = vidosaContext.Reactions.Where(r => r.ContentType == ContentType.Comment).ToList();

                    int totalPages = (int)Math.Floor((decimal)(MainComments.Count / 10)) +
                   (MainComments.Count % 10 >= 1 ? 1 : 0);
                    int currentPage =
                        Convert.ToInt32(page) > totalPages ? 1 : Convert.ToInt32(page);
                    currentPage = currentPage < 0 ? totalPages : currentPage;                    
                    int skipCounter = MainComments.OrderBy(c => c.DateTime).Count() <= 10 ?
                        0 : (currentPage - 1) * 10;
                    
                    int takeCounter = MainComments.Count - skipCounter > 10 ? 10 : (MainComments.Count - skipCounter);
                    List<Comment> takeComments = MainComments.OrderBy(c => c.DateTime).Skip(skipCounter).Take(takeCounter).ToList();

                    ViewBag.SkipCounter = skipCounter;
                    ViewBag.ReplyPage = currentPage + 1;
                    ViewBag.AllComments = comments;
                    ViewBag.MainCommentsCounter = MainComments.Count - (skipCounter + takeCounter);
                    ViewBag.CommentReactions = CommentReactions;

                    return PartialView(takeComments);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // GET: Comments
        public ActionResult GetComments(int ct, string key, string page)
        {
            try
            {
                List<Comment> comments = new List<Comment>();
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ViewBag.CommentKey = key;
                    ViewBag.CommentType = ct;
                    ViewBag.CurrentPage = Convert.ToInt32(page);
                    ViewBag.NextMainComment = Convert.ToInt32(page);
                    return PartialView();
                }                
            }
            catch (Exception)
            {
                throw;
            }
        }

        // POST: Comment
        [MvcAuthorize]
        [HttpPost]
        public ActionResult SetComment()
        {
            try
            {
                Comment comment = new Comment();
                bool IsmainComment = Convert.ToBoolean(Request.Form["IsmainComment"]);
                string key = Request.Form["key"];
                string content = Request.Form["cmnt-message"];
                string parentId = IsmainComment == true ? "comments-wrapper" : Request.Form["parentId"];
                string FullName = string.Empty;
                int ct = Convert.ToInt32(Request.Form["ct"]);
                ApplicationUser applicationUser = null;

                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    applicationUser = vidosaContext.Users.ToList().Find(u => u.Email == User.Identity.Name);
                    FullName = string.Format("{0} {1}", applicationUser.LastName, applicationUser.FirstName);

                    comment.CommentId = Guid.NewGuid().ToString().Replace("-", "");
                    comment.CommentKey = key;
                    comment.CommentType = (CommentType)ct;
                    comment.Content = HttpUtility.HtmlEncode(content);
                    comment.UserId = applicationUser.Id;
                    comment.DateTime = DateTime.Now;

                    if (!IsmainComment)
                    {
                        CommentReply commentReply = new CommentReply();
                        commentReply.CommentId = comment.CommentId;
                        commentReply.ParentId = parentId;
                        comment.IsReply = true;
                        commentReply.CommentDate = DateTime.Now;
                        vidosaContext.CommentReplies.Add(commentReply);
                    }
                    vidosaContext.Comments.Add(comment);
                    vidosaContext.SaveChanges();

                    SendComment(comment, User.Identity.Name, parentId);
                }
                return Json(new { commentId = comment.CommentId, commentKey = comment.CommentKey, parentId = parentId, IsMaincomment = IsmainComment, comment.CommentType, fullName = FullName, profilePic = applicationUser.ProfilePic,  IsNotification = false }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return PartialView("CommentError");
            }
        }

        /// <summary>
        /// Send the comment to all the other connected users.
        /// </summary>
        /// <param name="comment">The object encapsulating the comment to send.</param>
        [NonAction]
        private void SendComment(Comment comment, string email, string parentId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    IPersistentConnectionContext ConnectionContext = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
                    IConnection Connection = ConnectionContext.Connection;
                    ConnectionIds connectionIds = (from cids in vidosaContext.ConnectionIds
                                                   where cids.IsConnected == true && cids.Email == email
                                                   select cids).FirstOrDefault();

                    ApplicationUser applicationUser = (from u in vidosaContext.Users
                                                       where u.Id == comment.UserId
                                                       select u).FirstOrDefault();

                    string profilePic = applicationUser.ProfilePic;
                    string[] excludeCons = new string[] { connectionIds.ConnectionId };
                    
                    Connection.Broadcast(
                        JsonConvert.SerializeObject(
                            new
                            {
                                iframe = false,
                                function = "receiveComment",
                                IsNotification = true,
                                ParentId = parentId,    
                                ProfilePic = profilePic,
                                FullName = string.Format("{0} {1}", applicationUser.LastName, applicationUser.FirstName), 
                                Message = comment
                            }), excludeCons);
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
                int totalNumberOfPages = (int)(Math.Floor((decimal)(Posts.Count / 10))) +
                    (Posts.Count % 10 >= 1 ? 1 : 0);

                int currentPage = 
                    Convert.ToInt32(Request.QueryString["page"]) > totalNumberOfPages ? 1 : Convert.ToInt32(Request.QueryString["page"]);

                currentPage = currentPage < 0 ? totalNumberOfPages : currentPage;

                int skipCounter = Posts.Count() <= 10 ?
                    0 : (currentPage - 1) * 10;

                int takeCounter = Posts.Skip(skipCounter).Count() >= 10 ? 10 : Posts.Skip(skipCounter).Count();                

                List<Post> filteredPosts = Posts.OrderByDescending(p => p.DateUpdated)
                                           .Skip(skipCounter)
                                           .Take(takeCounter)
                                           .ToList();

                ViewBag.prev = currentPage - 1 == 0 ? totalNumberOfPages : currentPage - 1;

                ViewBag.next = currentPage + 1 <
                    totalNumberOfPages ? currentPage + 1 : 1;          

                return PartialView("getposts", filteredPosts); 
            }
        }

        // /blog/getpost
        public ActionResult GetPost(string purl = "")
        {
            try
            {
                string url = string.Empty;
                using (VidosaContext Context = new VidosaContext())
                {
                    purl = Context.Redirects.ToList().Exists(p => p.OldUrlId == purl) ? Context.Redirects.ToList().Find(p => p.OldUrlId == purl).NewUrlId : purl;
                    if (Request.IsAjaxRequest())
                    {
                        url = purl;
                    }
                    else
                    {
                        purl = Context.Redirects.ToList().Exists(p => p.OldUrlId == Request.QueryString["purl"]) ? Context.Redirects.ToList().Find(p => p.OldUrlId == Request.QueryString["purl"]).NewUrlId : Request.QueryString["purl"]; 
                        if (!Utility.IsCrawlbot(Request))
                        {
                            url = string.Format("{0}", purl);
                        }
                        else
                        {
                            purl = Context.Redirects.ToList().Exists(p => p.OldUrlId == purl) ? Context.Redirects.ToList().Find(p => p.OldUrlId == purl).NewUrlId : Request.Path.Replace("/blog/getpost/", "");
                            url = string.Format("{0}", purl);
                        }                        
                    }
                    Post BlogPost = (from post in Context.Posts
                                     where post.PostUrl == url
                                     select post).FirstOrDefault();

                    if (BlogPost is null)
                    {
                        return View("Blog post is null url = " + url);
                    }
                    List<Post> Posts = (from p in Context.Posts
                                        orderby p.DateUpdated descending
                                        select p).ToList();

                    List<Post> relatedPosts = new List<Post>();

                    foreach (Post post in Posts)
                    {
                        if (post.PostKey != BlogPost.PostKey)
                        {
                            PostSEO postSEO = Context.PostSEOs.ToList().Where(pseo => pseo.Id == post.Id).FirstOrDefault();                            
                            List<string> postKeywords = postSEO.Keywords.ToLower().Split(',').ToList();
                            PostSEO currentBlogSeo = Context.PostSEOs.ToList().Where(pseo => pseo.Id == BlogPost.Id).FirstOrDefault();

                            List<string> currentBlog = currentBlogSeo.Keywords.ToLower().Split(',').ToList();

                            var words = postKeywords.Intersect(currentBlog).ToList();
                            var test = words.Count() / (double)(postKeywords.Count + currentBlog.Count) * 100;

                            if (test > 0)
                            {
                                relatedPosts.Add(post);
                            }
                        }
                    }
                    Posts.OrderByDescending(p => p.DateUpdated);
                    relatedPosts.OrderByDescending(p => p.PusblishedDate);
                    List<Video> relatedVideos = Context.Videos.ToList();
                    relatedVideos.OrderByDescending(v => v.DatePublished);
                    for (int i = 0; i < Posts.Count; i++)
                    {
                        if (Posts[i].PostUrl.Equals(url))
                        {
                            ViewBag.prevurl = i > 0 ? Posts[i - 1].PostUrl : Posts[Posts.Count - 1].PostUrl;
                            ViewBag.nexturl = i + 1 <= Posts.Count - 1 ? Posts[i + 1].PostUrl : Posts[0].PostUrl; 
                        }
                    }

                    ApplicationUser applicationUser = Context.Users.ToList().Find(u => u.Id == BlogPost.UserId);
                    ViewBag.Author = string.Format("{0} {1}", applicationUser.LastName, applicationUser.FirstName);
                    ViewBag.Description = BlogPost.Blurb;
                    ViewBag.RelatedVideos = relatedVideos.Count > 5 ? relatedVideos.Take(5).ToList() : relatedVideos;
                    ViewBag.Keywords = (from pseos in Context.PostSEOs
                                        where pseos.PostKey == BlogPost.PostKey
                                        select pseos).FirstOrDefault().Keywords;
                    ViewBag.relatedPosts = relatedPosts.Count > 5 ? relatedPosts.Take(5).ToList() : relatedPosts;
                    ViewBag.Title = BlogPost.Title;

                    Chapter chapter = (from c in Context.Chapters where c.PostKey == BlogPost.PostKey select c).FirstOrDefault();
                    
                    if (chapter != null)
                    {
                        List<Chapter> chapters = (from c in Context.Chapters.ToList() where c.SubjectId == chapter.SubjectId select c).ToList();
                        ViewBag.PostInSubject = (from p in Context.Posts.ToList()
                                                 from c in chapters
                                                 where p.PostKey == c.PostKey
                                                 select p).ToList();
                    }
                    else
                    {
                        ViewBag.PostInSubject = new List<Post>();
                    }                    
                    return View(BlogPost);
                }
            }
            catch (Exception ex)
            {
                return View(ex);
            }
        }

        // Get all of the available posts
        public ActionResult GetPosts()
        {
            try
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    List<Post> Posts = Context.Posts.ToList().Where(p => p.IsDeleted == false)
                        .OrderByDescending(p => p.DateUpdated)
                        .Take(Context.Posts.Count() >= 10 ? 10 : Context.Posts.Count())
                        .ToList();

                    ViewBag.prev = (int)Math.Floor((decimal)(Context.Posts.Count() / 10)) + 
                        (Context.Posts.Count() % 10 >= 1 ? 1 : 0);

                    ViewBag.next = Context.Posts.Count() <= 10 ? 1 : 2;                      

                    ViewBag.Author = "Monaila Kgotliso";
                    ViewBag.Description = "C# programming .NET Framework tutorials.";
                    ViewBag.Keywords = ".NET, Visual Studio, C#, Programming";
                    ViewBag.Title = ".NET Tutorials";

                    return View(Posts);
                }            
            }
            catch (Exception ex)
            {
                return View();
            }
        }
    }
}