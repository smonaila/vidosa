using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Configuration;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
using Microsoft.Owin;
using Microsoft.AspNet.SignalR.Hosting;
using System.Xml.Linq;
using System.Linq;
using System.Data.Entity;
using Microsoft.AspNet.Identity.Owin;
using System.Web.Caching;

namespace vidosa.Models
{
    public class VidosaConnection : PersistentConnection
    {
        #region Custom Methods
        private TaskCollection StreamingTasks = null;
        private Cache Cache = new Cache();
        TimerCallback timerCallback = null;

        public TaskCollection GetStreamingCollection(HttpContextBase httpContext)
        {
            try
            {
                return StreamingTasks ?? httpContext.GetOwinContext().Get<TaskCollection>();
            }
            catch (Exception ex)
            {
                httpContext.GetOwinContext().Environment.Add("task", new TaskCollection());
                return StreamingTasks ?? httpContext.GetOwinContext().Get<TaskCollection>();
            }
        }
        #endregion
        #region PersistentConnection Properties
        private StreamServer StreamServer = new StreamServer();
        
        // private ApplicationUserManager _userManager;
        // private ApplicationSignInManager _signinManager;
        #endregion

        #region Properties to get the userManager object and the signInManager object
        // public ApplicationUserManager UserManager
        // {
        //    get { return _userManager ?? HttpContext.Current.GetOwinContext().Get<ApplicationUserManager>(); }
        //    set { _userManager = value; }
        // }

        // public ApplicationSignInManager SignInManager
        // {
        //    get { return _signinManager ?? HttpContext.Current.GetOwinContext().Get<ApplicationSignInManager>(); }
        // }
        #endregion

        public override Task ProcessRequest(HostContext context)
        {            
            return base.ProcessRequest(context);
        }

        protected override bool AuthorizeRequest(IRequest request)
        {
            var cookies = request.Cookies;
            if (request.User.Identity.IsAuthenticated)
            {                
                
            }            
            return base.AuthorizeRequest(request);
        }

        /// <summary>
        /// The user is connected to this connection and ready to receive data from it
        /// </summary>
        /// <param name="request">information about the requesting user</param>
        /// <param name="connectionId">the connection id that made the request.</param>
        /// <returns></returns>
        protected override Task OnConnected(IRequest request, string connectionId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    CachedItems cachedItems = new CachedItems();
                    CachedUser cachedUsers = cachedItems.GetCachedUser(request.GetHttpContext());
                    CachedConnectionId cachedConnections = cachedItems.GetCachedConnectionId(request.GetHttpContext(), connectionId,
                        JsonConvert.SerializeObject(new
                        {
                            frameId = string.Empty,
                            taskId = 0
                        }));

                    Connection.Send(connectionId, JsonConvert.SerializeObject(
                        new
                        {
                            cid=connectionId,
                            iframe=false,
                            function="getcid"
                        }));
                }
            }
            catch (Exception)
            {

            }
            return base.OnConnected(request, connectionId);
        }

        /// <summary>
        /// The method executed when the client has reconnected to this connection
        /// </summary>
        /// <param name="request">Information about the connection</param>
        /// <param name="connectionId">The id of the connection reconnecting</param>
        /// <returns>an awaitable task for reconnecting</returns>
        protected override Task OnReconnected(IRequest request, string connectionId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    CachedItems cachedItems = new CachedItems();
                    CachedConnectionId cachedConnection = cachedItems.GetCachedConnectionId(request.GetHttpContext(), connectionId);
                    if (!(cachedConnection is null))
                    {
                        cachedConnection.IsConnected = true;
                    }
                }
                return base.OnReconnected(request, connectionId);
            }
            catch (Exception)
            {
                throw;
            }
        }

        protected override Task OnDisconnected(IRequest request, string connectionId, bool stopCalled)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    CachedItems cachedItems = new CachedItems();
                    CachedConnectionId cachedConnection = cachedItems.GetCachedConnectionId(request.GetHttpContext(), connectionId);

                    if (!(cachedConnection is null))
                    {
                        cachedConnection.IsConnected = false;
                        Task.Run(() =>
                                    {
                                        int Counter = 0;
                                        Thread.Sleep(3000);
                                        while (Counter++ <= 60)
                                        {
                                            cachedConnection = cachedItems.GetCachedConnectionId(request.GetHttpContext(), connectionId);
                                            if (!(cachedConnection is null)  && Counter > 60)
                                            {
                                                if (!cachedConnection.IsConnected)
                                                {
                                                    cachedItems.RemoveConnectionId(request.GetHttpContext(), connectionId);
                                                    break; 
                                                }
                                            }
                                            Thread.Sleep(1000);
                                        }
                                    });
                    }         
                    return base.OnDisconnected(request, connectionId, stopCalled);
                }
            }
            catch (Exception)
            {
                return base.OnDisconnected(request, connectionId, stopCalled);
            }
        }

        protected override Task OnReceived(IRequest request, string connectionId, string data)
        {
            try
            {
                if (request.User.Identity.IsAuthenticated)
                {
                    using (VidosaContext vidosaContext = new VidosaContext())
                    {
                        CachedItems cachedItems = new CachedItems();
                        var _data = JsonConvert.DeserializeAnonymousType(data, new { frameId = string.Empty, taskId = string.Empty });
                        CachedUser cachedUsers = cachedItems.GetCachedUser(request.GetHttpContext());
                        CachedConnectionId cachedConnection = cachedItems.GetCachedConnectionId(request.GetHttpContext(), connectionId, data);
                    } 
                }
                return base.OnReceived(request, connectionId, data);
            }
            catch (Exception)
            {
                throw;
            }
        }
    }
}