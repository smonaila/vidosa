using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Configuration;
using System.Net;
using System.Net.Configuration;
using System.Net.Mail;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace vidosa.Models
{
    public class Bot
    {
        [Key]
        public int Id { get; set; }
        public string GetIpAddress { get; set; }
        public string GetName { get; set; }
        public string GetUserAgentString { get; set; }
        public string Username { get; set; }
    }

    public class CustomAuthorize : FilterAttribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationContext filterContext)
        {
            HttpRequestBase httpContextBase = filterContext.HttpContext.Request;
            if (Utility.IsCrawlbot(filterContext.HttpContext.Request))
            {               
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Bot bot = (from b in vidosaContext.Bots
                               where b.GetIpAddress == httpContextBase.UserHostAddress
                               select b).FirstOrDefault();

                    if (bot == null)
                    {
                        bot = new Bot();
                        bot.Username = string.Format("{0}@vidosa.co.za", Utility.GetBotName(httpContextBase.UserAgent));
                        bot.GetUserAgentString = httpContextBase.UserAgent;
                        bot.GetIpAddress = httpContextBase.UserHostAddress;
                        bot.GetName = Utility.GetBotName(httpContextBase.UserAgent);
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

                    httpContextBase.RequestContext.HttpContext.User = principal;
                }
            }
            else
            {
                if (!httpContextBase.IsAuthenticated)
                {
                    string ReturnUrl = httpContextBase.RawUrl;
                    filterContext.Result = new RedirectResult(string.Format("{0}={1}", "/account/login?ReturnUrl", Uri.EscapeDataString(ReturnUrl)));
                }
            } 
        }
    }

    public class CachedItems
    {
        public void RemoveConnectionId(HttpContextBase httpContextBase, string connectionId)
        {
            try
            {
                List<CachedConnectionId> cachedConnections = (List<CachedConnectionId>)httpContextBase.Cache["connectionIds"];
                CachedConnectionId currentConnection = cachedConnections.Find(c => c.ConnectionId == connectionId);

                cachedConnections.Remove(currentConnection);
            }
            catch (Exception)
            {
                throw;
            }
        }

        public CachedUser GetCachedUser(HttpContextBase httpContextBase)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    List<CachedUser> cachedUsers = (List<CachedUser>)httpContextBase.Cache["cachedUsers"];
                    CachedUser currentUser = cachedUsers is null ? null : cachedUsers.Find(u => u.Email == httpContextBase.User.Identity.Name);

                    if (currentUser is null)
                    {
                        ApplicationUser user = vidosaContext.Users.ToList().Find(u => u.Email == httpContextBase.User.Identity.Name);
                        currentUser = new CachedUser();
                        currentUser.UserId = user.Id;
                        currentUser.Id = user.UserId;
                        currentUser.FirstName = user.FirstName;
                        currentUser.LastName = user.LastName;
                        currentUser.Email = httpContextBase.User.Identity.Name;

                        if (cachedUsers is null)
                        {
                            cachedUsers = new List<CachedUser>();
                            cachedUsers.Add(currentUser);
                            httpContextBase.Cache.Insert("cachedUsers", cachedUsers);
                        }
                        else
                        {
                            cachedUsers.Add(currentUser);
                        }

                    }
                    return currentUser;
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        public CachedConnectionId GetCachedConnectionId(HttpContextBase httpContextBase, string connectionId)
        {
            try
            {
                List<CachedConnectionId> cachedConnections = (List<CachedConnectionId>)httpContextBase.Cache["connectionIds"];
                CachedConnectionId currentConnection = cachedConnections is null ? null : cachedConnections.Find(c => c.ConnectionId == connectionId);
                return currentConnection;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public CachedConnectionId GetCachedConnectionId(HttpContextBase httpContextBase, string connectionId, string data)
        {
            try
            {
                List<CachedConnectionId> cachedConnections = (List<CachedConnectionId>)httpContextBase.Cache["connectionIds"];
                CachedConnectionId currentConnection = cachedConnections is null ? null : cachedConnections.Find(c => c.ConnectionId == connectionId);

                var frameData = new { frameId = string.Empty, taskId = string.Empty };
                var _data = JsonConvert.DeserializeAnonymousType(data, frameData);

                if (currentConnection is null)
                {
                    currentConnection = new CachedConnectionId();
                    currentConnection.ConnectionId = connectionId;
                    currentConnection.Email = httpContextBase.User.Identity.Name;
                    currentConnection.FrameId = _data.frameId;
                    currentConnection.IsConnected = true;

                    if (cachedConnections is null)
                    {
                        cachedConnections = new List<CachedConnectionId>();
                        cachedConnections.Add(currentConnection);
                        httpContextBase.Cache.Insert("connectionIds", cachedConnections);
                    }
                    else
                    {
                        currentConnection.ConnectionId = connectionId;
                        currentConnection.FrameId = _data.frameId;
                        currentConnection.Email = httpContextBase.User.Identity.Name;
                        currentConnection.IsConnected = true;

                        cachedConnections.Add(currentConnection);
                    }
                }
                else
                {
                    currentConnection.IsConnected = true;
                    currentConnection.FrameId = _data.frameId;
                    currentConnection.ConnectionId = connectionId;
                    currentConnection.Email = httpContextBase.User.Identity.Name;
                }
                return currentConnection;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public CachedVideoplayback GetVideoPlayback(HttpContextBase httpContextBase, string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    List<CachedVideoplayback> cachedVideoplaybacks = (List<CachedVideoplayback>)httpContextBase.Cache["cachedPlayback"];
                    CachedVideoplayback currentPlayback = null;
                    if (!(cachedVideoplaybacks is null))
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
    }

    [NotMapped]
    public class CachedUser
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
    }

    [NotMapped]
    public class CachedConnectionId
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string ConnectionId { get; set; }
        public string FrameId { get; set; }
        public bool IsConnected { get; set; }
    }

    [NotMapped]
    public class CachedVideoplayback : Video
    {
        public int ElementIndex { get; set; }
        public DateTime ExpirationDate { get; set; }
    }

    public class StreamingServer : IDisposable
    {
        // public TaskCollection
        public static ObservableCollection<Sender> Create()
        {
            try
            {
                // IEnumerable<Sender> Senders = (from );
            }
            catch (Exception)
            {
                throw;
            }
            return new ObservableCollection<Sender>();
        }

        public void Dispose()
        {
            throw new NotImplementedException();
        }
    }

    public class TaskCollection : IDisposable
    {
        private static List<Sender> Senders = new List<Sender>();
        static IPersistentConnectionContext ConnectionContext = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
        static IConnection Connection = ConnectionContext.Connection;

        public enum StreamStatus
        {
            Started = 1,
            Running = 2,
            Paused = 3,
            Ended = 4,
            Canceled = 5,
            Waiting = 6,
            Error = 7
        }

        [JsonObject(MemberSerialization.OptIn)]
        public class Status
        {
            [JsonProperty(PropertyName = "streamStatus")]
            public string StreamStatus { get; set; }
            [JsonProperty(PropertyName = "connectionId")]
            public string ConnectionId { get; set; }
        }

        [JsonObject(MemberSerialization.OptIn)]
        public class StreamInf
        {
            [JsonProperty(PropertyName = "videoId")]
            public string VideoId { get; set; }
            [JsonProperty(PropertyName = "frameId")]
            public string FrameId { get; set; }
            [JsonProperty(PropertyName = "streamId")]
            public string StreamId { get; set; }
            [JsonProperty(PropertyName = "connectionId")]
            public string ConnectionId { get; set; }
            [JsonProperty(PropertyName = "status")]
            public string Status { get; set; }
        }

        public static void Start(HttpContextBase httpContextBase, Sender taskSender)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    CachedItems cachedItems = new CachedItems();
                    CachedConnectionId cachedConnection = cachedItems.GetCachedConnectionId(httpContextBase, taskSender.ConnectionId);

                    Senders.Add(taskSender);
                    taskSender.Task.Start();
                    taskSender.StreamStatus = StreamStatus.Running;
                    Connection.Send(taskSender.ConnectionId, JsonConvert.SerializeObject(
                                                    new
                                                    {
                                                        status = taskSender.StreamStatus.ToString(),
                                                        iframe = false,
                                                        function = "receiveStatus",
                                                        taskId = taskSender.Task.Id,
                                                        taskSender.Task.IsCompleted,
                                                        taskSender.Task.IsCanceled,
                                                        taskSender.Task.IsFaulted,
                                                        cachedConnection.FrameId,                                                        
                                                        taskSender.Token.IsCancellationRequested
                                                    }));

                    taskSender.Task.Wait();
                    taskSender.StreamStatus = StreamStatus.Ended;

                    Connection.Send(taskSender.ConnectionId, JsonConvert.SerializeObject(
                                                    new
                                                    {
                                                        status = taskSender.StreamStatus.ToString(),
                                                        iframe = false,
                                                        function = "receiveStatus",
                                                        taskId = taskSender.Task.Id,
                                                        taskSender.Task.IsCompleted,
                                                        taskSender.Task.IsCanceled,
                                                        taskSender.Task.IsFaulted,
                                                        cachedConnection.FrameId,
                                                        taskSender.Token.IsCancellationRequested
                                                    }));
                    Senders.Remove(taskSender);  
                }               
            }
            catch (Exception ex)
            {

                throw;
            }
        }

        public delegate void OnAdd(HttpContextBase httpContextBase, object sender, EventArgs e);
        static OnAdd onAdd;

        public static TaskCollection Create()
        {
            onAdd = new OnAdd(Senders_OnAdd);
            return new TaskCollection();
        }

        public void Add(HttpContextBase httpContextBase, Sender sender)
        {
            onAdd(httpContextBase, sender, new EventArgs());
        }

        private static void Senders_OnAdd(HttpContextBase httpContextBase, object sender, EventArgs e)
        {
            Sender newItem = (Sender)sender;
            if (Senders.Exists(oi => oi.ConnectionId == newItem.ConnectionId))
            {
                Sender oldSender = Senders.Find(oi => oi.ConnectionId == newItem.ConnectionId);
                if (oldSender.Task.Status == TaskStatus.Running)
                {
                    while (oldSender.Task.Status == TaskStatus.Running)
                    {
                        Thread.Sleep(10);
                    }
                    Start(httpContextBase, newItem);
                }
                else
                {
                    Start(httpContextBase, newItem);
                }
            }
            else
            {
                Start(httpContextBase, newItem);
            }
        }

        public void Remove(Sender sender)
        {
            Senders.Remove(sender);
        }

        public List<Sender> GetSenders()
        {
            return Senders;
        }

        public void Dispose()
        {
            
        }
    }

    public class ApplicationUser : IdentityUser
    {        
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime AccCrtDate { get; set; } 
        public string ProfilePic { get; set; }

        public async Task<ClaimsIdentity> GenerateUserIdentityAsync(UserManager<ApplicationUser> userManager)
        {
            var userIdentity = await userManager.CreateIdentityAsync(this, DefaultAuthenticationTypes.ApplicationCookie);
            return userIdentity;
        }

        public static ApplicationSignInManager Create(IdentityFactoryOptions<ApplicationSignInManager> options, IOwinContext context)
        {
            return new ApplicationSignInManager(context.GetUserManager<ApplicationUserManager>(), context.Authentication);
        }
    }

    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext()
            : base("VidosaContext", throwIfV1Schema: false)
        {

        }

        public static ApplicationDbContext Create()
        {
            return new ApplicationDbContext();
        }
    }

    public class EmailService : IIdentityMessageService
    {
        public Task SendAsync(IdentityMessage message)
        {
            // Plug in your email service here to send an email.
            try
            {
                SmtpSection smtpSection = (SmtpSection)ConfigurationManager.GetSection("system.net/mailSettings/smtp");

                MailAddress fromEmail = new MailAddress(smtpSection.From);
                MailAddress toEmail = new MailAddress(message.Destination);

                var smtp = new SmtpClient()
                {
                    Host = smtpSection.Network.Host,
                    Port = smtpSection.Network.Port,
                    EnableSsl = smtpSection.Network.EnableSsl,
                    DeliveryMethod = smtpSection.DeliveryMethod,
                    UseDefaultCredentials = smtpSection.Network.DefaultCredentials,
                    Credentials = new NetworkCredential(smtpSection.Network.UserName, smtpSection.Network.Password)
                };

                using (var _message = new MailMessage(fromEmail.Address, toEmail.Address)
                {
                    Subject = message.Subject,
                    Body = message.Body,
                    IsBodyHtml = true,
                    DeliveryNotificationOptions = DeliveryNotificationOptions.OnSuccess
                })
                {
                    smtp.Send(_message);
                }
            }
            catch (SmtpException smtpException)
            {
                // There was an error sending the email
                // Make sure that you remove the added record from the email List table.
                string errorMessage = string.Format("There was a problem sending a message to {0}", message.Destination);
                throw new SmtpException(errorMessage, smtpException);
            }
            return Task.FromResult(0);
        }
    }

    public class ConnectionIds
    {
        [Key]
        public int Id { get; set; }
        public bool IsConnected { get; set; }
        public string ConnectionId { get; set; }
        public string FrameId { get; set; }
        public string Email { get; set; }
    }

    public class SmsService : IIdentityMessageService
    {
        public Task SendAsync(IdentityMessage message)
        {
            // Plug in your SMS service here to send a text message.
            return Task.FromResult(0);
        }
    }
}