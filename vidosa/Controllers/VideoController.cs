using Microsoft.AspNet.Identity.Owin;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Data.Entity;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Caching;
using System.Web.Mvc;
using System.Web.Security;
using System.Xml.Linq;
using vidosa.Areas.admin.Models;
using vidosa.Models;
using static vidosa.Models.TaskCollection;
using FileIO = System.IO.File;
using MvcAuthorize = System.Web.Mvc.AuthorizeAttribute;

namespace vidosa.Controllers
{
    public class VideoController : Controller
    {
        private Cache cache = new Cache();
        
        private int representationId = 1;
        private TaskCollection StreamingTasks;

        private static ObservableCollection<Sender> SenderTasks = new ObservableCollection<Sender>();

        public ActionResult GetRelateVideos()
        {
            try
            {
                var videoId = Utility.IsCrawlbot(Request) && !(Request.QueryString["v"] is null) ? Request.FilePath.Split('=')[1] : Request.QueryString["v"];
                var isPartial = Convert.ToBoolean(Request.QueryString["ispartial"]);

                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = (from au in vidosaContext.Users.ToList()
                                                       where au.Email == User.Identity.Name
                                                       select au).FirstOrDefault();

                    Video video = vidosaContext.Videos.Where(v => v.VideoId == videoId).FirstOrDefault();

                    List<Reactions> VideoReactions = vidosaContext.Reactions.Where(r => (r.ContentId == video.VideoId) && (r.ContentType == ContentType.Video)).ToList();
                    List<Reactions> CommentReactions = vidosaContext.Reactions.Where(r => (r.ContentId == video.VideoId) && (r.ContentType == ContentType.Comment)).ToList();

                    IEnumerable<ChannelSubs> channelSubs = (from cs in vidosaContext.ChannelSubs.ToList()
                                                            where cs.ChannelId == video.UserId
                                                            select cs);

                    ViewBag.VideoLikes = VideoReactions.Where(r => r.Reaction == ReactionType.Like).ToList().Count;
                    ViewBag.VideoUnlike = VideoReactions.Where(r => r.Reaction == ReactionType.Unlike).ToList().Count;
                    ViewBag.CommentReactions = CommentReactions;
                    ViewBag.ViewsCounter = (from view in vidosaContext.VideoViews
                                            where view.VideoId == video.VideoId
                                            select view).ToList().Count;

                    ViewBag.IsSubscribed = channelSubs.ToList().Exists(cs => cs.Username == applicationUser.Email);
                    ViewBag.Metadata = string.Format("{0},{1}", video.Description, video.Title);
                    video.VideoDetails = vidosaContext.VideoDetails.Where(v => v.VideoId == video.VideoId).FirstOrDefault().HtmlContent;
                    ViewBag.CountSubscription = channelSubs.Count();

                    ViewBag.IsAjax = Request.IsAjaxRequest();
                    ViewBag.Url = string.Format("{0}?ispartial=false&v={1}", Request.Url.LocalPath, video.VideoId);

                    // Get Comments for this video
                    ViewBag.Comments = vidosaContext.Comments.Where(c => c.CommentKey == video.VideoId && c.CommentType == (CommentType)CommentType.Video && !c.IsReply).ToList();

                    // SEO Related Information
                    ViewBag.Keywords = vidosaContext.SEOs.Where(seo => seo.VideoId == video.VideoId).FirstOrDefault().Keywords;
                    ViewBag.Author = "Monaila Kgotliso";
                    ViewBag.Title = video.Title;
                    ViewBag.Description = video.Description;

                    return PartialView(video);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        protected class BitStreamInf
        {
            private List<IDictionary<string, object>> fileStream;
            public BitStreamInf(ConnectionIds cIds, string bitStream)
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Dictionary<string, object> BitStreams = new Dictionary<string, object>();
                    BitStreams.Add(string.Format("{0}", cIds.ConnectionId), string.Format("{0}", bitStream));
                    fileStream.Add(BitStreams);
                }
            }
            public List<IDictionary<string, object>> FileStreams { get; set; }
        }

        // GET: Video
        [AllowAnonymous]
        public ActionResult Index()
        {
            return View();
        }

        /// <summary>
        /// This method is going to be registering each user viewing the video,
        /// identified by the videoId parameter.
        /// </summary>
        /// <param name="videoId">The videoId to identify the video.</param>
        /// <returns>The Number of Views</returns>
        public ActionResult GetViews(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ApplicationUser applicationUser = (from u in vidosaContext.Users
                                                       where u.UserName == User.Identity.Name
                                                       select u).FirstOrDefault();

                    VideoViews videoView = new VideoViews();
                    videoView.IPAddress = Request.ServerVariables["REMOTE_ADDR"];
                    videoView.VideoId = videoId;
                    videoView.UserName = applicationUser.Email;

                    vidosaContext.VideoViews.Add(videoView);
                    vidosaContext.SaveChanges();

                    return Json(new { }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        public FileResult GetInIt(string videoId)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                Video video = (from v in vidosaContext.Videos
                               where v.VideoId == videoId
                               select v).FirstOrDefault();
                byte[] file = FileIO.ReadAllBytes(Server.MapPath(string.Format("{0}\\{1}", video.Path, "1080bitstreams_dash_init.mp4")));
                return File(file, "video/mp4");
            }
        }

        public ActionResult Subscribe()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    bool IsSubscribed = false;
                    ApplicationUser applicationUser = (from u in vidosaContext.Users.ToList()
                                                       where u.Email == User.Identity.Name
                                                       select u).FirstOrDefault();

                    string ChannelId = Request.QueryString["channelId"];
                    ApplicationUser ChannelUser = (from u in vidosaContext.Users.ToList()
                                                   where u.Id == ChannelId
                                                   select u).FirstOrDefault();


                    if (!(vidosaContext.ChannelSubs.ToList().Exists(cs => cs.Username == applicationUser.Email)))
                    {
                        vidosaContext.ChannelSubs.Add(new ChannelSubs() { ChannelId = ChannelUser.Id, Username = applicationUser.Email });
                        vidosaContext.SaveChanges();
                        IsSubscribed = true;
                    }
                    else
                    {
                        ChannelSubs channelSubs = (from cs in vidosaContext.ChannelSubs.ToList()
                                                   where cs.Username == applicationUser.Email
                                                   select cs).FirstOrDefault();
                        vidosaContext.Entry(channelSubs).State = EntityState.Deleted;
                        vidosaContext.SaveChanges();
                        IsSubscribed = false;
                    }
                    return Json(new { IsSubscribed }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public FileResult Getmpd(string videoId)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                Video video = (from v in vidosaContext.Videos
                               where v.VideoId == videoId
                               select v).FirstOrDefault();

                var mpdFile = Directory.GetFiles(Server.MapPath(video.Path), "*.mpd").FirstOrDefault();
                if (video is null)
                {

                }
                return File(mpdFile, "text/xml");
            }
        }

        public void ReportNetworkProps(string videoId)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                ConnectionIds connectionIds = vidosaContext.ConnectionIds.Where(cid => cid.Email == User.Identity.Name).FirstOrDefault();
                if (connectionIds is null)
                {
                    return;
                }
                BitStreamInf bitStream = new BitStreamInf(connectionIds, videoId);
                cache.Insert("streamNetwork", bitStream);                
            }
        }

        private void cacheRemo(string key, object value, CacheItemRemovedReason reason)
        {
            throw new NotImplementedException();
        }

        // Get the Collection of Tasks that are currently Streaming.
        public TaskCollection GetStreamingCollection
        {
            get
            {
                try
                {
                    return StreamingTasks ?? HttpContext.GetOwinContext().Get<TaskCollection>();
                }
                catch (Exception ex)
                {
                    HttpContext.GetOwinContext().Environment.Add("task", new TaskCollection());
                    return StreamingTasks ?? HttpContext.GetOwinContext().Get<TaskCollection>();
                }
            }
            set
            {
                StreamingTasks = value;
            }
        }

        [MvcAuthorize(Users = "smonaila@gmail.com")]
        public ActionResult FileToUpload()
        {
            return View();
        }

        [ValidateInput(false)]
        [HttpPost]
        public ActionResult UpdateVideo(UploadFileView uploadFileView)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Video video = vidosaContext.Videos.ToList().Find(v => v.VideoId == Request.Form["videoId"]);
                    video.Description = uploadFileView.Blurb;
                    video.Title = uploadFileView.Title;

                    SEO sEO = vidosaContext.SEOs.ToList().Find(seo => seo.VideoId == video.VideoId);
                    sEO.Blurb = uploadFileView.Blurb;
                    sEO.Description = video.Description;
                    sEO.Keywords = uploadFileView.Keywords;
                    sEO.VideoId = video.VideoId;

                    VideoDetails videoDetails = vidosaContext.VideoDetails.ToList().Find(vd => vd.VideoId == video.VideoId);
                    videoDetails.VideoId = video.VideoId;
                    videoDetails.HtmlContent = HttpUtility.HtmlEncode(uploadFileView.HtmlCode);

                    vidosaContext.Entry(video).State = EntityState.Modified;
                    vidosaContext.Entry(sEO).State = EntityState.Modified;
                    vidosaContext.Entry(videoDetails).State = EntityState.Modified;
                    vidosaContext.SaveChanges();
                }
            }
            catch (Exception)
            {
                throw;
            }
            return PartialView();
        }

        [HttpPost]
        public ActionResult UploadThumb()
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    HttpFileCollectionBase httpFiles = Request.Files;
                    HttpPostedFile[] Files = new HttpPostedFile[httpFiles.Count];
                    httpFiles.CopyTo(Files, 0);

                    List<string> ThumbsFiles = Directory.GetFiles(Server.MapPath(string.Format("/videos/thumbs/")), "*.*").ToList();

                    for (int i = 0; i < Files.Count(); i++)
                    {
                        if (ThumbsFiles.Exists(s => s == Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"]))))
                        {
                            Directory.Delete(Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"])));
                            Files[i].SaveAs(Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"])));
                        }
                        else
                        {
                            Files[i].SaveAs(Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"])));
                        }
                    }
                    return Json(new { FileSaved = true }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public ActionResult UploadFile(UploadFileView uploadFileView)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    HttpFileCollectionBase httpPostedFiles = Request.Files;
                    HttpPostedFile[] Files = new HttpPostedFile[httpPostedFiles.Count];
                    httpPostedFiles.CopyTo(Files, 0);
                    ApplicationUser applicationUser = (from u in vidosaContext.Users
                                                       where u.Email == User.Identity.Name
                                                       select u).FirstOrDefault();

                    foreach (var httpPostedFile in Files)
                    {
                        if (httpPostedFile != null && httpPostedFile.ContentLength > 0)
                        {
                            if (httpPostedFile.ContentType == "video/mp4")
                            {
                                string videoId = Utility.GetVideoUrlId();

                                Video video = new Video();
                                video.DatePublished = DateTime.Now;
                                video.IsFree = true;
                                video.IsSubscription = false;
                                video.Path = string.Format("{0}{1}", "/videos/", videoId);
                                video.VideoId = videoId;
                                video.UserId = applicationUser.Id;

                                Directory.CreateDirectory(Server.MapPath(video.Path));

                                SEO sEO = new SEO();
                                sEO.Blurb = "This is a short description";
                                sEO.Description = "Description for your video for SEO";
                                sEO.Keywords = "Add, keywords, separated, by, comma, like, this";
                                sEO.VideoId = video.VideoId;

                                VideoDetails videoDetails = new VideoDetails();
                                videoDetails.VideoId = video.VideoId;
                                videoDetails.HtmlContent = "Need some details for your video";

                                var DisplayName = Path.GetFileName(httpPostedFile.FileName);
                                var FileExtension = Path.GetExtension(DisplayName);
                                var FileName = string.Format("{0}", DisplayName);
                                var FilePath = Path.Combine(Server.MapPath(string.Format("{0}", video.Path)), FileName);
                                httpPostedFile.SaveAs(FilePath);

                                // the code to cut the video to the specified time.
                                ProcessStartInfo processStartInfo = new ProcessStartInfo();

                                processStartInfo.FileName = string.Format("{0}", Server.MapPath("/tools/gpac/mp4box.exe"));
                                processStartInfo.Arguments = string.Format("-dash 1000 -rap -frag -rap {0}", Server.MapPath(string.Format("{0}\\{1}", video.Path, FileName)));
                                processStartInfo.ErrorDialog = false;
                                processStartInfo.RedirectStandardError = false;
                                processStartInfo.RedirectStandardInput = false;
                                processStartInfo.RedirectStandardOutput = false;
                                processStartInfo.WorkingDirectory = Server.MapPath(video.Path);
                                processStartInfo.CreateNoWindow = true;

                                // Create and start the process
                                Process process = new Process();
                                process.StartInfo = processStartInfo;

                                process.Start();
                                process.WaitForExit();

                                if (process.HasExited)
                                {
                                    switch (process.ExitCode)
                                    {
                                        case 0:
                                            // File Segmented Successfuly
                                            video.Title = FileName;
                                            vidosaContext.Videos.Add(video);
                                            vidosaContext.SEOs.Add(sEO);
                                            vidosaContext.VideoDetails.Add(videoDetails);
                                            vidosaContext.SaveChanges();

                                            Utility.UpdateMpd(video);

                                            uploadFileView.Title = video.Title;
                                            uploadFileView.Url = video.VideoId;
                                            uploadFileView.VideoId = video.VideoId;
                                            break;
                                        case 1:
                                            // there was a problem segmenting the file.
                                            break;
                                        default:
                                            break;
                                    }
                                }
                            }

                            if (httpPostedFile.ContentType == "image/jpeg" || httpPostedFile.ContentType == "image/png")
                            {
                                List<string> ThumbsFiles = Directory.GetFiles(Server.MapPath(string.Format("/videos/thumbs/")), "*.*").ToList();

                                for (int i = 0; i < Files.Count(); i++)
                                {
                                    if (ThumbsFiles.Exists(s => s == Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"]))))
                                    {
                                        Directory.Delete(Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"])));
                                        Files[i].SaveAs(Server.MapPath(string.Format("/videos/thumbs/{0}", Request["videoId"])));
                                    }
                                    else
                                    {
                                        string videoId = Request["videoId"];
                                        Video video = (from v in vidosaContext.Videos
                                                       where v.VideoId == videoId
                                                       select v).FirstOrDefault();

                                        FileInfo fileInfo = new FileInfo(Files[i].FileName);
                                        video.Thumb = string.Format("/videos/thumbs/{0}{1}", Request["videoId"], fileInfo.Extension);
                                        vidosaContext.Entry(video).State = EntityState.Modified;
                                        vidosaContext.SaveChanges();
                                        Files[i].SaveAs(Server.MapPath(string.Format("/videos/thumbs/{0}{1}", Request["videoId"], fileInfo.Extension)));
                                    }
                                }
                            }
                            uploadFileView.HtmlCode = HttpUtility.HtmlDecode(uploadFileView.HtmlCode);
                            return PartialView("UploadForm", uploadFileView);
                        }
                    }
                    return Json(null);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public ActionResult PausePlayStream(Status status)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    ConnectionIds connectionIds = (from c in vidosaContext.ConnectionIds
                                                   where c.Email == User.Identity.Name && c.IsConnected == true &&
                                                   c.ConnectionId == status.ConnectionId
                                                   select c).FirstOrDefault();

                    TaskCollection taskCollection = GetStreamingCollection;
                    List<Sender> senders = taskCollection.GetSenders();

                    if (senders.Exists(s => s.ConnectionId == connectionIds.ConnectionId))
                    {
                        Sender sender = senders.Find(s => s.ConnectionId == connectionIds.ConnectionId);
                        sender.StreamStatus = (StreamStatus)Enum.Parse(typeof(StreamStatus), status.StreamStatus);
                        sender.TokenSource.Cancel();
                        return Json(new { Status = sender.StreamStatus.ToString(), TaskId = sender.Task.Id }, JsonRequestBehavior.AllowGet);
                    }
                    else
                    {
                        return Json(new { Status = "NotFound", TaskId = 0x000000 }, JsonRequestBehavior.AllowGet);
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new { Status = "Error", Message = ex.StackTrace, TaskId = 0x00000 }, JsonRequestBehavior.AllowGet);
            }
        }

        private bool CancelStreaming(string connectionId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    List<ConnectionIds> _List = (from c in vidosaContext.ConnectionIds select c).ToList();
                    List<ConnectionIds> connectionIds = (from c in vidosaContext.ConnectionIds
                                                         where c.Email == User.Identity.Name && c.IsConnected == true &&
                                                         c.ConnectionId == connectionId
                                                         select c).ToList();

                    TaskCollection taskCollection = GetStreamingCollection;
                    List<Sender> senders = taskCollection.GetSenders();

                    for (int i = 0; i < connectionIds.Count; i++)
                    {
                        Sender sender = senders.Find(s => s.ConnectionId == connectionIds[i].ConnectionId);
                        if (!(sender is null))
                        {
                            if (sender.Task.Status == TaskStatus.Running)
                            {
                                sender.TokenSource.Cancel();
                            }
                        }
                    }
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }

        public ActionResult GetReaction(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    var Content_Type = (ContentType)((Convert.ToInt32(Request.QueryString["ct"])));
                    var ContentId = Request.QueryString["cid"];
                    var Reaction = (ReactionType)((Convert.ToInt32(Request.QueryString["rt"])));
                    var ApplicationUser = (from u in vidosaContext.Users
                                           where u.Email == User.Identity.Name
                                           select u).FirstOrDefault();
                    var ReactionList = vidosaContext.Reactions.ToList();

                    Reactions reactions = new Reactions();
                    reactions.UserId = ApplicationUser.Id;

                    if (!ReactionList.Exists(r => (r.UserId == reactions.UserId && r.ContentId == ContentId) && (r.ContentType == Content_Type)))
                    {
                        reactions.ContentId = ContentId;
                        reactions.ContentType = Content_Type;
                        reactions.Reaction = Reaction;
                        vidosaContext.Reactions.Add(reactions);
                    }
                    else
                    {
                        Reactions OldReaction = (from r in vidosaContext.Reactions
                                                 where r.UserId == ApplicationUser.Id && r.ContentId == ContentId && r.ContentType == Content_Type
                                                 select r).FirstOrDefault();

                        OldReaction.ContentId = ContentId;
                        OldReaction.ContentType = Content_Type;
                        OldReaction.Reaction = Reaction;
                        OldReaction.UserId = ApplicationUser.Id;

                        vidosaContext.Entry(OldReaction).State = EntityState.Modified;

                    }
                    vidosaContext.SaveChanges();
                    return View();
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // Get and return the Cached Items
        [NonAction]
        private CachedVideoplayback GetCachedPlayback(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    List<CachedVideoplayback> cachedVideoplaybacks = (List<CachedVideoplayback>)HttpContext.Cache["cachedPlayback"];
                    CachedVideoplayback currentPlayback = null;
                    if (!(cachedVideoplaybacks is null) )
                    {
                        currentPlayback = cachedVideoplaybacks.Find(cvpb => cvpb.VideoId == videoId);
                    }
                    return currentPlayback;
                }                
            }
            catch (Exception)
            {
                throw;
            }
        }

        // Wait for the user to connect/reconnect
        [NonAction]
        private void Wait(StreamInf streamInf, int elementIndex)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    int Counter = 0;                   
                    string Email = User.Identity.Name;
                    IPersistentConnectionContext ConnectionContext = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
                    IConnection Connection = ConnectionContext.Connection;
                    CachedItems cachedItems = new CachedItems();
                    CachedUser currentUser = cachedItems.GetCachedUser(HttpContext);
                    List<Sender> senders = GetStreamingCollection.GetSenders();
                    Sender sender = senders.Find(s => s.ConnectionId == streamInf.ConnectionId && s.Task.Status == TaskStatus.Running);
                    CachedConnectionId currentConnection = cachedItems.GetCachedConnectionId(HttpContext, streamInf.ConnectionId, 
                        JsonConvert.SerializeObject(
                            new
                            {
                                frameId = streamInf.FrameId,
                                taskId = sender is null ? 0 : sender.Task.Id
                            }));                    

                    while (!currentConnection.IsConnected && currentConnection.FrameId == streamInf.FrameId &&
                        currentConnection.Email == User.Identity.Name && Counter++ <= 10)
                    {
                        currentConnection = cachedItems.GetCachedConnectionId(HttpContext, streamInf.ConnectionId, JsonConvert.SerializeObject(
                            new
                            {
                                frameId = streamInf.FrameId,
                                taskId = sender is null ? 0 : sender.Task.Id
                            }));
                        Thread.Sleep(1000);
                    }

                    if (Counter > 10 && !(currentConnection is null) && !(currentConnection.IsConnected))
                    {
                        List<CachedVideoplayback> cachedVideoplaybacks = (List<CachedVideoplayback>)HttpContext.Cache["cachedPlayback"];
                        CachedVideoplayback newplayback = null;
                        

                        if (cachedVideoplaybacks is null)
                        {
                            cachedVideoplaybacks = new List<CachedVideoplayback>();
                            newplayback = new CachedVideoplayback();
                            newplayback.VideoId = streamInf.VideoId;
                            newplayback.UserId = currentUser.UserId;
                            newplayback.ElementIndex = elementIndex;
                            cachedVideoplaybacks.Add(newplayback);
                            
                            cache.Insert("cachedPlayback", cachedVideoplaybacks);
                        }
                        else
                        {
                            cachedVideoplaybacks.RemoveAll(cvpb => (DateTime.Now.DayOfYear - cvpb.ExpirationDate.DayOfYear) > 7);
                            if (cachedVideoplaybacks.Exists(cvpb => cvpb.VideoId == streamInf.VideoId && cvpb.UserId == currentUser.UserId))
                            {
                                CachedVideoplayback cachedVideoplayback = cachedVideoplaybacks.Find(cvpb => cvpb.VideoId == streamInf.VideoId && cvpb.UserId == currentUser.UserId);
                                
                                cachedVideoplayback.ElementIndex = elementIndex;
                                cachedVideoplayback.UserId = currentUser.UserId;
                                cachedVideoplayback.VideoId = streamInf.VideoId;
                                cachedVideoplayback.ExpirationDate = DateTime.Now.AddDays(7);
                            }
                            else
                            {
                                newplayback = new CachedVideoplayback();
                                newplayback.VideoId = streamInf.VideoId;
                                newplayback.UserId = currentUser.UserId;
                                newplayback.ElementIndex = elementIndex;
                                newplayback.ExpirationDate = DateTime.Now.AddDays(7);

                                cachedVideoplaybacks.Add(newplayback);
                            }
                        }
                        if (!(sender is null))
                        {
                            sender.TokenSource.Cancel();
                        }                        
                    }
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Start Streaming
        [HttpPost]
        public ActionResult StartStreaming(StreamInf streamInf)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    
                    IPersistentConnectionContext ConnectionContext = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
                    IConnection Connection = ConnectionContext.Connection;
                    CachedItems cachedItems = new CachedItems();
                    CachedUser currentUser = cachedItems.GetCachedUser(HttpContext);
                    CachedConnectionId currentConnection = cachedItems.GetCachedConnectionId(HttpContext, streamInf.ConnectionId);
                    CachedVideoplayback cachedVideoplayback = cachedItems.GetVideoPlayback(HttpContext, streamInf.VideoId);

                    string Email = User.Identity.Name;
                    int StatusCode = 200;
                    string Message = string.Format("Stream Ended");
                    List<Sender> RunningTasks = GetStreamingCollection.GetSenders();
                    Sender sender = new Sender();
                    sender.SenderId = streamInf.StreamId;
                    sender.CurrentId = sender.SenderId; // To be checked
                    sender.TokenSource = new CancellationTokenSource();
                    sender.Token = sender.TokenSource.Token;
                   
                    Sender CurrentSender = RunningTasks.Find(rt => rt.ConnectionId == streamInf.ConnectionId && 
                    (rt.Task.Status == TaskStatus.Running || rt.Task.Status == TaskStatus.RanToCompletion));
                    bool IsNull = CurrentSender is null ? true : false;

                    currentConnection.ConnectionId = streamInf.ConnectionId;
                    currentConnection.Email = User.Identity.Name;
                    currentConnection.IsConnected = true;
                    currentConnection.FrameId = streamInf.FrameId;

                    if (!IsNull)
                    {
                        if (CurrentSender.Task.Status == TaskStatus.Running)
                        {
                            CurrentSender.TokenSource.Cancel();
                        }                        
                    }
                    Wait(streamInf, 0);

                    if (Connection is null || ConnectionContext is null)
                    {
                        throw new StreamingException("Experinced a streaming error", streamInf.VideoId);
                    }
                    sender.ConnectionId = currentConnection.ConnectionId;
                    sender.Task = new Task(async () =>
                    {
                        using (VidosaContext context = new VidosaContext())
                        {
                            Video video = cachedVideoplayback is null ? (from v in context.Videos.ToList()
                                           where v.VideoId == streamInf.VideoId
                                           select v).FirstOrDefault() : cachedVideoplayback;

                            // Collect the information that may raise an error.
                            if ((video is null) || (Connection is null || 
                            ConnectionContext is null) || 
                            (Email.Equals("") || Email is null) || 
                            (currentConnection is null))
                            {
                                CurrentSender = RunningTasks.Find(rt => rt.ConnectionId == currentConnection.ConnectionId);
                                CurrentSender.StreamStatus = StreamStatus.Error;
                                StatusCode = 102;
                                Message = string.Format("The Url is invalid");
                                return;
                            }

                            Tuple<int, Stream, XElement[], int> FileInfo = GetFileInfo(video);
                            long byteLength = 0;

                            // Check if you need to insert an ad
                            AdInsertion(video, 0);
                            
                            // Send an Initiliazation Segment Here!.
                            CurrentVideo currentVideo = StreamInit(video, true);
                            currentVideo.StreamId = streamInf.StreamId;
                            List<List<byte>> initCon = new List<List<byte>>();
                            initCon.Add(currentVideo.Content);

                            await Connection.Send(currentConnection.ConnectionId,
                                        JsonConvert.SerializeObject(
                                            new
                                            {
                                                currentvideo = currentVideo,
                                                iframe = true,
                                                function = "vidseg",
                                                initialization = true
                                            }));

                            // Need to write a method that is going to send the bytes to the calling client here!
                            // bool nextPre = false;
                            // int test = 0;

                            FileInfo.Item2.Position = Convert.ToInt32(FileInfo.Item3[0].Attribute("mediaRange").Value.Split('-')[0]);
                            int SegmentCounter = FileInfo.Item1;

                            var RunningTask = (from task in RunningTasks
                                               where task.ConnectionId == currentConnection.ConnectionId
                                               && task.Task.Status == TaskStatus.Running
                                               select task).FirstOrDefault();

                            bool istaskCanceled = RunningTask != null ? RunningTask.TokenSource.IsCancellationRequested : false;                            
                            for (int xelementIndex = cachedVideoplayback is null ? 0 : Convert.ToInt32(cachedVideoplayback.ElementIndex); xelementIndex < SegmentCounter; xelementIndex++)
                            {
                                // Wait(streamInf, xelementIndex);

                                int Start = Convert.ToInt32(FileInfo.Item3[xelementIndex].Attribute("mediaRange").Value.Split('-')[0]);
                                int End = Convert.ToInt32(FileInfo.Item3[xelementIndex].Attribute("mediaRange").Value.Split('-')[1]);
                                byteLength = End - Start + 1;
                                byte[] fileBytes = new byte[byteLength];

                                RunningTask = (from task in RunningTasks
                                               where task.ConnectionId == currentConnection.ConnectionId
                                               && task.Task.Status == TaskStatus.Running
                                               select task).FirstOrDefault();

                                // Read the Segment from the file
                                FileInfo.Item2.Read(fileBytes, 0, fileBytes.Length);


                                int bytesIndex = 0;

                                while (bytesIndex < fileBytes.Length)
                                {
                                    RunningTask = (from task in RunningTasks
                                                   where task.ConnectionId == currentConnection.ConnectionId
                                                   && task.Task.Status == TaskStatus.Running
                                                   select task).FirstOrDefault();

                                    if (RunningTask.TokenSource.IsCancellationRequested && RunningTask.Task.Status == TaskStatus.Running)
                                    {
                                        RunningTask.StreamStatus = StreamStatus.Canceled;
                                        StatusCode = 103;
                                        Message = string.Format("Stream canceled by the user");
                                        break;
                                    }
                                    
                                    var _byteData = fileBytes.Length - bytesIndex <= 1024 ?
                                    fileBytes.Skip(bytesIndex).Take(fileBytes.Length - bytesIndex).ToList() :
                                    fileBytes.Skip(bytesIndex).Take(1024).ToList();

                                    currentVideo.Content = _byteData;
                                    currentVideo.SegIndex = xelementIndex;
                                    currentVideo.Representation = FileInfo.Item4;
                                    currentVideo.Size = (int)byteLength;

                                    // Send the Sequence of bytes.
                                    // conArray.Add(_byteData);

                                    await Connection.Send(currentConnection.ConnectionId,
                                            JsonConvert.SerializeObject(
                                                new
                                                {
                                                    currentvideo = currentVideo,
                                                    iframe = true,
                                                    function = "vidseg",
                                                    initialization = false,
                                                    isLastsubsegment = bytesIndex + _byteData.Count() >= fileBytes.Count() ? true : false
                                                }));

                                    bytesIndex +=
                                    _byteData.Count + bytesIndex < fileBytes.Count() ?
                                    1024 : _byteData.Count();

                                    Thread.Sleep(1);
                                }
                                if (RunningTask.TokenSource.IsCancellationRequested)
                                {
                                    RunningTask.StreamStatus = StreamStatus.Canceled;
                                    StatusCode = 103;
                                    Message = string.Format("Stream canceled by the user");
                                    break;
                                }
                                AdInsertion(video, xelementIndex + 1);

                                // Check the presentation to play.
                                // if (test > 5 && !nextPre)
                                // {
                                //    nextPre = true;
                                //    FileInfo.Item2.Close();
                                //    FileInfo.Item2.Dispose();
                                //    representationId++;
                                //    FileInfo = GetFileInfo(video);
                                //    FileInfo.Item2.Position = Convert.ToInt32(FileInfo.Item3[xelementIndex + 1].Attribute("mediaRange").Value.Split('-')[0]);

                                //    // CurrentVideo Init = StreamInit(video, true);
                                //    // await Connection.Send(connectionIds.ConnectionId,
                                //    //    JsonConvert.SerializeObject(
                                //    //        new
                                //    //        {
                                //    //            currentvideo = Init,
                                //    //            iframe = true,
                                //    //            function = "vidseg",
                                //    //            initialization = true
                                //    //        }));
                                // }
                                // test++;
                            }
                        }
                    });
                    GetStreamingCollection.Add(HttpContext, sender);
                    var streamStatus = new {
                        Status = sender.StreamStatus.ToString(),
                        streamInf.VideoId,
                        Code = StatusCode,
                        Message,
                        streamId = sender.SenderId
                    };            
                    return Json(streamStatus, JsonRequestBehavior.AllowGet);
                }
            }
            catch (StreamingException sException)
            {
                Exception ex = new Exception(sException.Message, new Exception());
                StreamingException exception = new StreamingException("Custom Thrower Exception", ex);
                return Json(new { Status = "Error", VideoId = streamInf.VideoId, Message = "Streaming Exception", Code = 100 }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                StreamingException exception = new StreamingException("Streaming Error!", ex);
                exception.VideoId = streamInf.VideoId;
                return Json(new { Status = "Error", VideoId = streamInf.VideoId, Message = ex.InnerException.StackTrace, Code = 101 }, JsonRequestBehavior.AllowGet);
            }
        }

        private void AdInsertion(Video video, int AdTime)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    var mpdFile = Directory.GetFiles(Server.MapPath(video.Path), "*.mpd").FirstOrDefault();

                    XDocument xDocument = XDocument.Load(mpdFile).Document;
                    XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();

                    XElement Period = xDocument.Descendants(xNamespace + "Period")
                        .Where(p => p.Attribute("type").Value.Equals("ad") && Convert.ToInt32(p.Attribute("start").Value) == AdTime * 10).FirstOrDefault();

                    if (Period is null)
                    {
                        return;
                    }

                    IEnumerable<XElement> Representations = Period.Descendants(xNamespace + "Representation");

                    var fileName = (from rep in Representations
                                    where Convert.ToInt32(rep.Attribute("id").Value) == 1
                                    from b in rep.Descendants()
                                    where b.Name.LocalName == "BaseURL"
                                    select b).FirstOrDefault().Value;


                    // string BaseUrl = Period.Descendants(xNamespace + "BaseURL").FirstOrDefault().Value;
                    XElement[] xElements = Period.Descendants(xNamespace + "SegmentURL").ToArray();
                    string FileUrl = string.Format("{0}{1}", Server.MapPath(Period.Attribute("AdUrl").Value), fileName);

                    long xElementCounter = xElements.LongLength;
                    using (Stream adStream = FileIO.Open(FileUrl, FileMode.Open, FileAccess.ReadWrite, FileShare.ReadWrite))
                    {
                        IPersistentConnectionContext ConnectionContext = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
                        IConnection Connection = ConnectionContext.Connection;
                        string Email = User.Identity.Name;
                        ConnectionIds connectionIds = (from cid in vidosaContext.ConnectionIds
                                                       where cid.Email == Email
                                                       select cid).FirstOrDefault();
                        XElement initSeg = Period.Descendants(xNamespace + "Initialization").FirstOrDefault();

                        int Start = Convert.ToInt32(initSeg.Attribute("range").Value.Split('-')[0]);
                        int End = Convert.ToInt32(initSeg.Attribute("range").Value.Split('-')[1]);
                        long byteLength = (End - Start) + 1;
                        byte[] fileBytes = new byte[byteLength];

                        adStream.Read(fileBytes, 0, fileBytes.Length);

                        // Send an Initiliazation Segment Here!.
                        CurrentVideo currentVideo = new CurrentVideo();
                        currentVideo.Content = fileBytes.ToList();
                        currentVideo.IsInitialization = true;
                        currentVideo.IsLastSegment = true;
                        currentVideo.Size = fileBytes.Length;

                        Connection.Send(connectionIds.ConnectionId,
                                       JsonConvert.SerializeObject(
                                           new
                                           {
                                               currentvideo = currentVideo,
                                               iframe = true,
                                               function = "vidseg",
                                               initialization = true,
                                           }));

                        for (int xElementIndex = 0; xElementIndex < xElementCounter; xElementIndex++)
                        {
                            Start = Convert.ToInt32(xElements[xElementIndex].Attribute("mediaRange").Value.Split('-')[0]);
                            End = Convert.ToInt32(xElements[xElementIndex].Attribute("mediaRange").Value.Split('-')[1]);

                            byteLength = (End - Start) + 1;
                            fileBytes = new byte[byteLength];

                            // This variable is created for testing purposes.
                            List<List<byte>> conArray = new List<List<byte>>();

                            // Read the Segment from the file
                            adStream.Read(fileBytes, 0, fileBytes.Length);
                            int bytesIndex = 0;

                            while (bytesIndex < fileBytes.Length)
                            {
                                var _byteData = fileBytes.Length - bytesIndex <= 1024 ?
                                    fileBytes.Skip(bytesIndex).Take(fileBytes.Length - bytesIndex).ToList() :
                                    fileBytes.Skip(bytesIndex).Take(1024).ToList();

                                currentVideo.Content = _byteData;
                                currentVideo.SegIndex = xElementIndex;
                                currentVideo.Representation = 1;
                                currentVideo.Size = (int)byteLength;

                                // Send the Sequence of bytes.
                                // conArray.Add(_byteData);
                                Connection.Send(connectionIds.ConnectionId,
                                        JsonConvert.SerializeObject(
                                            new
                                            {
                                                currentvideo = currentVideo,
                                                iframe = true,
                                                function = "vidseg",
                                                initialization = false,
                                                isLastsubsegment = bytesIndex + _byteData.Count() >= fileBytes.Count() ? true : false
                                            }));

                                bytesIndex +=
                                    _byteData.Count + bytesIndex < fileBytes.Count() ?
                                    1024 : _byteData.Count();

                                Thread.Sleep(1);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        private static void PrintSeg(List<List<byte>> conArray)
        {
            List<byte> con = new List<byte>();
            for (int i = 0; i < conArray.Count; i++)
            {
                for (int j = 0; j < conArray[i].Count; j++)
                {
                    con.Add(conArray[i][j]);
                }
            }
            MemoryStream memoryStream = new MemoryStream(con.ToArray());
            int Offset = 0;
            long SegmentLength = memoryStream.Length;
            Console.WriteLine("Box Size\t\tBox Name");
            do
            {
                byte[] _Buffer = new byte[8];
                memoryStream.Read(_Buffer, 0, 8);
                // memoryStream.Read();
                var BoxInf = GetBoxInf(_Buffer);
                Debug.Flush();
                Debug.WriteLine("{0}\t\t{1}", BoxInf.size, BoxInf.name);
                Offset += BoxInf.size;
                memoryStream.Position = Offset;
            } while (memoryStream.Position < memoryStream.Length);
        }

        private static BoxInf GetBoxInf(byte[] buffer)
        {
            MemoryStream memoryStream = new MemoryStream(buffer);
            byte[] bufferLength = new byte[4];
            byte[] bufferName = new byte[4];

            memoryStream.Read(bufferLength, 0, bufferLength.Length);
            memoryStream.Read(bufferName, 0, bufferName.Length);

            Array.Reverse(bufferLength);

            BoxInf boxInf = new BoxInf();
            boxInf.size = BitConverter.ToInt32(bufferLength, 0);

            for (int i = 0; i < bufferName.Length; i++)
            {
                boxInf.name += Convert.ToChar(bufferName[i]);
            }
            return boxInf;
        }

        class BoxInf
        {
            public int size { get; set; }
            public string name { get; set; }
        }

        private Tuple<int, Stream, XElement[], int> GetFileInfo(Video video)
        {
            var mpdFile = Directory.GetFiles(Server.MapPath(video.Path), "*.mpd").FirstOrDefault();

            XDocument xDocument = XDocument.Load(mpdFile).Document;
            XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();
            XElement Period = xDocument.Descendants(xNamespace + "Period").Where(p => p.Attribute("type").Value == "video").FirstOrDefault();
            IEnumerable<XElement> Representations = Period.Descendants(xNamespace + "Representation");

            var fileUrl = (from rep in Representations
                           where Convert.ToInt32(rep.Attribute("id").Value) == representationId
                           from b in rep.Descendants()
                           where b.Name.LocalName == "BaseURL"
                           select b).FirstOrDefault().Value;

            int segCounter = (from rep in Representations
                              where Convert.ToInt32(rep.Attribute("id").Value) == representationId
                              from seg in rep.Descendants()
                              where seg.Name.LocalName.ToLower() == "SegmentURL".ToLower()
                              select seg).ToList().Count;

            Stream stream = FileIO.Open(string.Format("{0}\\{1}", Server.MapPath(video.Path), fileUrl), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite);

            XElement RepElement = (from rep in Representations
                                   where Convert.ToInt32(rep.Attribute("id").Value) == representationId
                                   select rep).FirstOrDefault();

            XElement[] xElements = (from xelem in RepElement.Descendants()
                                    where xelem.Name.LocalName.ToLower() == "SegmentURL".ToLower()
                                    select xelem).ToArray();

            return Tuple.Create(segCounter, stream, xElements, representationId);
        }

        private CurrentVideo StreamInit(Video video, bool IsMainVideo)
        {
            // Send an Initialization Segment
            var mpdFile = Directory.GetFiles(Server.MapPath(video.Path), "*.mpd").FirstOrDefault();

            XDocument xDocument = XDocument.Load(mpdFile).Document;
            XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();
            XElement Period = xDocument.Descendants(xNamespace + "Period").Where(p => p.Attribute("type").Value == "video").FirstOrDefault();

            IEnumerable<XElement> Representations = Period.Descendants(xNamespace + "Representation");

            XElement initSeg = Period.Descendants(xNamespace + "Initialization").FirstOrDefault();
            // string initFile = initSeg.Attribute("sourceURL").Value;

            var fileUrl = (from rep in Representations
                           where Convert.ToInt32(rep.Attribute("id").Value) == representationId
                           from b in rep.Descendants()
                           where b.Name.LocalName == "BaseURL"
                           select b).FirstOrDefault().Value;

            XElement RepElement = (from rep in Representations
                                   where Convert.ToInt32(rep.Attribute("id").Value) == representationId
                                   select rep).FirstOrDefault();

            XElement[] xElements = (from xelem in RepElement.Descendants()
                                    where xelem.Name.LocalName.ToLower() == "SegmentURL".ToLower()
                                    select xelem).ToArray();

            int InitEnd = Convert.ToInt32(xElements[0].Attribute("mediaRange").Value.Split('-')[0]);
            int initLength = Convert.ToInt32(initSeg.Attribute("range").Value.Split('-')[1]) - 0;

            using (Stream stream = FileIO.Open(string.Format("{0}\\{1}", Server.MapPath(video.Path), fileUrl), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                byte[] initBuffer = new byte[initLength + 1];
                stream.Read(initBuffer, 0, initBuffer.Length);
                CurrentVideo currentVideo = new CurrentVideo();
                currentVideo.Content = initBuffer.ToList();
                currentVideo.IsInitialization = true;
                currentVideo.IsLastSegment = true;
                currentVideo.Size = initBuffer.Length;
                return currentVideo;
            }
        }

        /// <summary>
        /// This method is supposed to get the collection of boxes in a segment.
        /// </summary>
        /// <param name="segBytes">The segment to parse.</param>
        /// <returns></returns>
        private Task<string[]> GetBoxes(byte[] segBytes)
        {
            throw new NotImplementedException();
        }

        private VideoMetrics GetMetrics(Video video)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    var mpdFilePath = Server.MapPath(string.Format(@"{0}", video.Path));
                    var mpdFile = Directory.GetFiles(mpdFilePath, "*.mpd").FirstOrDefault();

                    // XML document for the mpdFile
                    XDocument xDocument = XDocument.Load(mpdFile);
                    XNamespace xNamespace = xDocument.Root.GetDefaultNamespace();

                    var adaptationSet = (from adpSet in xDocument.Descendants(xNamespace + "AdaptationSet") select adpSet)
                        .FirstOrDefault();

                    VideoMetrics videoMetrics = new VideoMetrics();

                    videoMetrics.Width = Convert.ToInt32(adaptationSet.Attribute("maxWidth").Value);
                    videoMetrics.Height = Convert.ToInt32(adaptationSet.Attribute("maxHeight").Value);
                    videoMetrics.AspectRatio = Convert.ToString(adaptationSet.Attribute("par").Value);

                    video.Height = Convert.ToInt32(adaptationSet.Attribute("maxHeight").Value);

                    return videoMetrics;
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // This is the Player Action.
        [CustomAuthorize]
        public ActionResult Player()
        {
            try
            {
                var videoId = Utility.IsCrawlbot(Request) ? Request.FilePath.Split('=')[1] : 
                    Request.QueryString["v"];

                var IsCrawler = Utility.IsCrawlbot(Request);
                var isPartial = Convert.ToBoolean(Request.QueryString["ispartial"]);

                using (VidosaContext Context = new VidosaContext())
                {
                    Video video = Context.Videos.Where(v => v.VideoId == videoId).FirstOrDefault();
                    ApplicationUser applicationUser; List<Reactions> VideoReactions, CommentReactions;
                    IEnumerable<ChannelSubs> channelSubs;

                    if (video != null && !IsCrawler)
                    {
                        applicationUser = (from au in Context.Users.ToList()
                                                           where au.Email == User.Identity.Name
                                                           select au).FirstOrDefault();

                        VideoReactions = Context.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Video))).ToList();
                        CommentReactions = Context.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Comment))).ToList();

                        channelSubs = (from cs in Context.ChannelSubs.ToList()
                                       where cs.ChannelId == video.UserId
                                       select cs);
                        ViewBag.IsSubscribed = channelSubs.ToList().Exists(cs => cs.Username == applicationUser.Email);

                        ViewBag.VideoLikes = VideoReactions.Where(r => r.Reaction == ReactionType.Like).ToList().Count;
                        ViewBag.VideoUnlike = VideoReactions.Where(r => r.Reaction == ReactionType.Unlike).ToList().Count;
                        ViewBag.CommentReactions = CommentReactions;
                        ViewBag.ViewsCounter = (from view in Context.VideoViews
                                                where view.VideoId == video.VideoId
                                                select view).ToList().Count;

                        VideoMetrics videoMetrics = GetMetrics(video);

                        ViewBag.VideoWidth = videoMetrics.Width;
                        ViewBag.VideoHeight = videoMetrics.Height;
                        ViewBag.AspectRatio = videoMetrics.AspectRatio;

                        ViewBag.Metadata = string.Format("{0},{1}", video.Description, video.Title);
                        video.VideoDetails = Context.VideoDetails.Where(v => v.VideoId == video.VideoId).FirstOrDefault().HtmlContent;
                        ViewBag.CountSubscription = channelSubs.Count();

                        ViewBag.IsAjax = Request.IsAjaxRequest();
                        ViewBag.Url = string.Format("{0}?ispartial=false&v={1}", Request.Url.LocalPath, video.VideoId);

                        // Get Comments for this video
                        ViewBag.Comments = Context.Comments.Where(c => c.CommentKey == video.VideoId && c.CommentType == (CommentType)CommentType.Video && !c.IsReply).ToList();

                        // SEO Related Information
                        ViewBag.Keywords = Context.SEOs.Where(seo => seo.VideoId == video.VideoId).FirstOrDefault().Keywords;
                        ViewBag.Author = "Monaila Kgotliso";
                        ViewBag.Title = video.Title;
                        ViewBag.Description = video.Description;

                        return View(video);
                    }
                    else if(video != null && IsCrawler)
                    {
                        video.VideoDetails = Context.VideoDetails.Where(v => v.VideoId == video.VideoId).FirstOrDefault().HtmlContent;
                        ViewBag.Comments = Context.Comments.Where(c => c.CommentKey == video.VideoId && c.CommentType == (CommentType)CommentType.Video && !c.IsReply).ToList();
                        
                        // SEO Related Information
                        ViewBag.Keywords = Context.SEOs.Where(seo => seo.VideoId == video.VideoId).FirstOrDefault().Keywords;
                        ViewBag.Author = "Monaila Kgotliso";
                        ViewBag.Title = video.Title;
                        ViewBag.Description = video.Description;

                        return View("CrawlerVideoPage", video);
                    }
                    return View(video);
                }
            }
            catch (Exception ex)
            {
                return View(ex);
            }
        }

        public ActionResult GetPlayer(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Video video = (from v in vidosaContext.Videos
                                   where v.VideoId == videoId
                                   select v).FirstOrDefault();

                    return PartialView(video);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // GET: This is the player to play the video
        [AllowAnonymous]
        public ActionResult VideoPlayer()
        {
            try
            {
                var videoId = Request.QueryString["v"];
                var isPartial = Convert.ToBoolean(Request.QueryString["ispartial"]);

                using (VidosaContext Context = new VidosaContext())
                {
                    if ((videoId is null) || videoId.Equals(""))
                    {
                        Exception exception = new Exception();
                        throw new PlayerException("VideoId could not be retrieved", exception);
                    }

                    // This part of the code should ensure that it picks all the videos related to the requested video
                    Video video = Context.Videos.Where(v => v.VideoId == videoId).FirstOrDefault();
                    List<Video> RelatedVideos = Context.Videos.Where(v => !v.VideoId.Equals(video.VideoId)).ToList();

                    for (int i = 0; i < RelatedVideos.Count; i++)
                    {
                        RelatedVideos[i].Duration = GetDuration(RelatedVideos[i]);
                    }

                    if (video != null)
                    {
                        return PartialView(video);
                    }
                    else
                    {
                        Exception exception = new Exception();
                        throw new PlayerException("Video Object was null", exception);
                    }
                }
            }
            catch (PlayerException pExcpetion)
            {
                return PartialView("PlayerError", pExcpetion);
            }
            catch (Exception ex)
            {
                //Exception exception = new Exception();
                //exception.Source = ex.Source;

                return PartialView("PlayerError", ex);
            }
        }

        [AllowAnonymous]
        public ActionResult PreviewPlayer()
        {
            using (VidosaContext Context = new VidosaContext())
            {
                var videoId = Request.QueryString["v"];
                Video video = Context.Videos.Where(v => v.VideoId == videoId).FirstOrDefault();
                if (video != null)
                {
                    return PartialView(video);
                }
                else
                {
                    return PartialView();
                }
            }
        }

        public ActionResult EditPreview()
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                var videoId = Request.QueryString["v"];
                Video video = vidosaContext.Videos.Where(v => v.VideoId == videoId).FirstOrDefault();
                UploadFileView updateFileView = new UploadFileView();

                if (video != null)
                {
                    VideoDetails videoDetails = (from vd in vidosaContext.VideoDetails
                                                 where vd.VideoId == video.VideoId
                                                 select vd).FirstOrDefault();

                    SEO videoSEO = (from vseo in vidosaContext.SEOs
                                    where vseo.VideoId == video.VideoId
                                    select vseo).FirstOrDefault();

                    updateFileView.Blurb = video.Description;
                    updateFileView.HtmlCode = HttpUtility.HtmlDecode(videoDetails.HtmlContent);
                    updateFileView.Title = video.Title;
                    updateFileView.Keywords = videoSEO.Keywords;
                    updateFileView.VideoId = video.VideoId;
                    updateFileView.Url = video.Url;

                    ViewBag.ThumUrl = video.Thumb;

                    return View(updateFileView);
                }
                else
                {
                    updateFileView.Blurb = "No Video was Found";
                    updateFileView.HtmlCode = "No Video was found";
                    updateFileView.Title = "No Video was Found";
                    updateFileView.Keywords = "No Video was found";

                    ViewBag.ThumUrl = video.Thumb;

                    return View(updateFileView);
                }
            }
        }


        // The Search method that will return the matching results.
        [HttpGet]
        [AllowAnonymous]
        public JsonResult Search(string userSearch)
        {
            using (VidosaContext Context = new VidosaContext())
            {
                try
                {
                    SearchResults searchResults = new SearchResults();
                    List<SearchResults> videos = searchResults.GetSearchResults(Request).OrderByDescending(s => s.Date).ToList();

                    var results = (from search in videos
                                   select
                                   new
                                   {
                                       Title = search.Title.ToLower(),
                                       Username = string.Format("{0} {1}",
                                       Context.Users.ToList().Find(u => u.Id == search.UserId).LastName,
                                       Context.Users.ToList().Find(u => u.Id == search.UserId).FirstName),
                                       Type = search.IsPost == true ? "blog" : "vlog"
                                   }).ToList();

                    return Json(results, JsonRequestBehavior.AllowGet);
                }
                catch (Exception exception)
                {
                    return Json(new { message = exception.ToString() }, JsonRequestBehavior.AllowGet);
                }
            }
        }

        // GET: This is the page with all the matching results.
        [AllowAnonymous]
        [HttpGet]
        public ActionResult GetVideos(string sq)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                SearchResults search = new SearchResults();
                List<SearchResults> searchResults = search.GetSearchResults(Request);

                List<Post> relatedPosts = vidosaContext.Posts.ToList();
                List<Video> relatedVideos = vidosaContext.Videos.ToList();

                foreach (Post post in relatedPosts)
                {
                    if (!searchResults.Exists(sr => sr.UrlId == post.PostKey))
                    {
                        PostSEO postSEO = vidosaContext.PostSEOs.ToList().Where(pseo => pseo.Id == post.Id).FirstOrDefault();
                        List<string> postKeywords = postSEO.Keywords.ToLower().Split(',').ToList();
                        List<string> searchedTitle = Request.QueryString["searchbar"].ToLower().Trim().Split(' ').ToList();

                        var words = postKeywords.Intersect(searchedTitle).ToList();
                        var test = words.Count() / (double)(postKeywords.Count + searchedTitle.Count) * 100;

                        if (test > 0)
                        {
                            searchResults.Add(new SearchResults() { UrlId = post.PostUrl, Blurb = post.Blurb, Content = post.Content, Date = post.DateUpdated, Duration = string.Empty, IsPost = true, Thumb = post.ThumbUrl, Title = post.Title });
                        }
                    }
                }

                foreach (Video video in relatedVideos)
                {
                    if (!searchResults.Exists(sr => sr.UrlId == video.VideoId))
                    {
                        SEO videoSEO = vidosaContext.SEOs.ToList().Where(vseo => vseo.VideoId == video.VideoId).FirstOrDefault();
                        if (videoSEO is null)
                        {
                            continue;
                        }
                        List<string> postKeywords = videoSEO.Keywords.ToLower().Split(',').ToList();
                        List<string> searchedTitle = Request.QueryString["searchbar"].ToLower().Trim().Split(' ').ToList();

                        var words = postKeywords.Intersect(searchedTitle).ToList();
                        var test = words.Count() / (double)(postKeywords.Count + searchedTitle.Count) * 100;

                        if (test > 0)
                        {
                            VideoDetails videoDetails = vidosaContext.VideoDetails.ToList().Find(vd => vd.VideoId == video.VideoId);
                            searchResults.Add(new SearchResults() { UrlId = video.VideoId, Blurb = video.Description, Content = videoDetails.HtmlContent, Date = video.DatePublished, Duration = string.Empty, IsPost = false, Thumb = video.Thumb, Title = video.Title });
                        }
                    }
                }

                for (int i = 0; i < searchResults.Count; i++)
                {
                    if (!searchResults[i].IsPost)
                    {
                        Video video = vidosaContext.Videos.ToList().Find(vid => vid.VideoId == searchResults[i].UrlId);
                        searchResults[i].Duration = GetDuration(video);
                    }
                }
                ViewBag.IsAjax = Request.IsAjaxRequest();
                // ViewBag.Url = string.Format("{0}?ispartial=false&sq={1}", Request.Url.LocalPath, sq.Trim().Replace(" ", "+"));
                var orderedSearch = searchResults.OrderByDescending(s => s.Date).ToList();
                return PartialView(orderedSearch);
            }
        }

        // GET: This method is called when the current playing video has finished
        public ActionResult _GetRelated(string matching, string current_vid_id)
        {
            return PartialView();
        }

        // Hash tag search
        public ActionResult GetHashTags(string hashtag)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                List<Post> posts = vidosaContext.Posts.ToList();
                List<Video> videos = vidosaContext.Videos.ToList();
                List<SearchResults> searchResults = new List<SearchResults>();

                foreach (Post post in posts)
                {
                    if (!post.PostKey.Equals(Request.QueryString["pid"]))
                    {
                        PostSEO postSEO = vidosaContext.PostSEOs.ToList().Find(pseo => pseo.PostKey == post.PostKey);
                        List<string> postKeywords = postSEO.Keywords.Replace(" ", "").Split(',').ToList();

                        var results = postKeywords.Find(s => s.Equals(hashtag.Replace("#", "")));

                        if (!(results is null))
                        {
                            searchResults.Add(new SearchResults()
                            {
                                Blurb = post.Blurb,
                                Content = post.Content,
                                Date = post.PusblishedDate,
                                IsPost = true,
                                Thumb = post.ThumbUrl,
                                Title = post.Title,
                                UrlId = post.PostUrl,
                                UserId = post.UserId
                            });
                        }
                    }
                }

                foreach (Video video in videos)
                {
                    if (!video.VideoId.Equals(Request.QueryString["pid"]))
                    {
                        //SEO sEO = vidosaContext.SEOs.ToList().Find(seo => seo.VideoId == video.VideoId);
                        //List<string> keyWords = sEO.Keywords.Replace(" ", "").Split(',').ToList();

                        //var results = keyWords.Find(s => s.Equals(hashtag.Replace("#", "")));

                        //if (!(results is null))
                        //{
                        //    searchResults.Add(new SearchResults()
                        //    {
                        //        Blurb = video.Description,
                        //        Content = vidosaContext.VideoDetails.ToList().Find(vd => vd.VideoId == video.VideoId).HtmlContent,
                        //        Date = video.DatePublished,
                        //        IsPost = false,
                        //        Thumb = video.Thumb,
                        //        Title = video.Title,
                        //        UrlId = video.VideoId,
                        //        UserId = video.UserId
                        //    });
                        //}
                    }
                }
                return PartialView("GetVideos", searchResults);
            }
        }

        public ActionResult GetVideInf(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Video video = (from v in vidosaContext.Videos.ToList()
                                   where v.VideoId == videoId
                                   select v).FirstOrDefault();

                    ApplicationUser applicationUser = (from au in vidosaContext.Users.ToList()
                                                       where au.Email == User.Identity.Name
                                                       select au).FirstOrDefault();

                    List<Reactions> VideoReactions = vidosaContext.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Video))).ToList();
                    List<Reactions> CommentReactions = vidosaContext.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Comment))).ToList();

                    IEnumerable<ChannelSubs> channelSubs = (from cs in vidosaContext.ChannelSubs.ToList()
                                                            where cs.ChannelId == video.UserId
                                                            select cs);

                    ViewBag.IsSubscribed = channelSubs.ToList().Exists(cs => cs.Username == applicationUser.Email);

                    ViewBag.VideoLikes = VideoReactions.Where(r => r.Reaction == ReactionType.Like).ToList().Count;
                    ViewBag.VideoUnlike = VideoReactions.Where(r => r.Reaction == ReactionType.Unlike).ToList().Count;
                    ViewBag.CommentReactions = CommentReactions;
                    ViewBag.ViewsCounter = ViewBag.ViewsCounter = (from view in vidosaContext.VideoViews
                                                                   where view.VideoId == video.VideoId
                                                                   select view).ToList().Count;


                    ViewBag.CountSubscription = channelSubs.Count();

                    return PartialView(video);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // GET: This is the method that will load the related most recent videos
        public ActionResult GetRelated(string matching, string current_vid_id)
        {
            using (VidosaContext Context = new VidosaContext())
            {
                try
                {
                    List<Video> relatedVideos = (from video in Context.Videos.ToList()
                                                 select video).ToList();

                    bool IsVideoEnded = Convert.ToBoolean(Request.QueryString["isvidended"]);
                    if (relatedVideos.Count <= 0)
                    {
                        relatedVideos = Context.Videos.ToList();
                    }

                    for (int i = 0; i < relatedVideos.Count; i++)
                    {
                        Video video = relatedVideos[i];
                        List<Reactions> VideoReactions = Context.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Video))).ToList();
                        List<Reactions> CommentReactions = Context.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Comment))).ToList();

                        ViewBag.VideoLikes = VideoReactions.Where(r => r.Reaction == ReactionType.Like).ToList().Count;
                        ViewBag.VideoUnlike = VideoReactions.Where(r => r.Reaction == ReactionType.Unlike).ToList().Count;
                        ViewBag.CommentReactions = CommentReactions;

                        ViewBag.ViewsCounter = (from view in Context.VideoViews
                                                where view.VideoId == video.VideoId
                                                select view).ToList().Count;

                        relatedVideos[i].Duration = GetDuration(relatedVideos[i]);
                    }

                    relatedVideos = relatedVideos.OrderByDescending(rv => rv.DatePublished).ToList();

                    if (IsVideoEnded)
                    {
                        return PartialView("GetRelated", relatedVideos);
                    }
                    return PartialView("_GetRelated", relatedVideos);
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
                    var adaptationSet = (from adpSet in xDocument.Descendants(xNamespace + "AdaptationSet") select adpSet)
                        .FirstOrDefault();
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
            catch (Exception exception)
            {
                throw new Exception(string.Format("Error when trying to calculate the duration of a video: {0}", video.VideoId), exception.InnerException);
            }
        }

        // Testing method
        public ActionResult TestMethod()
        {
            return View();
        }
    }
}