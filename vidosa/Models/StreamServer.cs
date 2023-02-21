using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Infrastructure;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using System.Xml.Linq;

namespace vidosa.Models
{
    public class StreamServer
    {
        class Sender
        {
            public string SenderId { get; set; }
            public string CurrentId { get; set; }
            public string ConnectionId { get; set; }
            public Task Task { get; set; }
            public CurrentVideo CurrentVideo { get; set; }
            public CancellationToken Token { get; set; }
            public CancellationTokenSource TokenSource { get; set; }
            public string RemoteAddress { get; set; }
        }

        private IConnection Connection = null;
        private HttpServerUtility ServerUtility = HttpContext.Current.Server;
        private static ObservableCollection<Sender> SenderTasks = new ObservableCollection<Sender>();

        
        public StreamServer()
        {
            Connection = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>().Connection;
            SenderTasks.CollectionChanged += SenderTasks_Changed;
        }

        // Hash using the MD5
        public string Encrypt(string input)
        {
            string output = string.Empty;
            MD5 md5 = new MD5CryptoServiceProvider();

            // compute hash from the bytes of text
            md5.ComputeHash(ASCIIEncoding.ASCII.GetBytes(string.Format("{0}&passphrase={1}", input,
                ConfigurationManager.AppSettings["pass_phrase"])));

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

        /// <summary>
        /// Executes when a new task is added into the collection
        /// </summary>
        /// <param name="sender">the object that generated this event</param>
        /// <param name="e">the object representing the generated event.</param>
        private void SenderTasks_Changed(object sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    Sender newsender = (Sender)((Object[])e.NewItems.SyncRoot)[0];
                    
                    var RunningTasks = (from task in SenderTasks
                                        where task.ConnectionId == newsender.ConnectionId
                                        
                                        && task.Task.Status == TaskStatus.Running
                                        select task).ToArray();

                    for (int i = 0; i < RunningTasks.Count(); i++)
                    {
                        RunningTasks[i].TokenSource.Cancel();
                    }

                    if (RunningTasks.Where(t => t.ConnectionId == newsender.ConnectionId && 
                    (t.Task.Status == TaskStatus.Running)).Count() <= 0)
                    {
                        newsender.SenderId = Encrypt(string.Format("{0}{1}", newsender.ConnectionId, DateTime.Now.ToString()));
                        newsender.CurrentVideo.StreamId = newsender.SenderId;
                        newsender.CurrentVideo.SenderId = newsender.SenderId;

                        Connection.Send(newsender.ConnectionId, JsonConvert.SerializeObject(
                        new
                        {
                            function = "new_viddetails",
                            isframe = false,
                            newviddetails =
                                new
                                {
                                    streamId = newsender.SenderId,
                                    bandwidth = newsender.CurrentVideo.Bandwidth,
                                    videoId = newsender.CurrentVideo.VideoId
                                }
                        }));
                        newsender.Task.Start();
                    }
                    break;
                case NotifyCollectionChangedAction.Remove:
                    Sender oldsender = (Sender)((object[])e.OldItems.SyncRoot)[0];
                    newsender = SenderTasks.Where(s => s.ConnectionId == oldsender.ConnectionId).FirstOrDefault();

                    if (!(newsender is null))
                    {
                        RunningTasks = (from task in SenderTasks
                                        where task.ConnectionId == newsender.ConnectionId
                                        && task.Task.Status == TaskStatus.Running
                                        select task).ToArray();

                        newsender.SenderId = Encrypt(string.Format("{0}{1}", newsender.ConnectionId, DateTime.Now.ToString()));
                        newsender.CurrentVideo.StreamId = newsender.SenderId;
                        newsender.CurrentVideo.SenderId = newsender.SenderId;

                        if (RunningTasks.Where(t => t.ConnectionId == newsender.ConnectionId &&
                    (t.Task.Status == TaskStatus.Running)).Count() <= 0)
                        {
                            newsender.SenderId = Encrypt(string.Format("{0}{1}", newsender.ConnectionId, DateTime.Now.ToString()));
                            newsender.CurrentVideo.StreamId = newsender.SenderId;
                            newsender.CurrentVideo.SenderId = newsender.SenderId;

                            Connection.Send(newsender.ConnectionId, JsonConvert.SerializeObject(
                            new
                            {
                                function = "new_viddetails",
                                isframe = false,
                                newviddetails =
                                    new
                                    {
                                        streamId = newsender.SenderId,
                                        bandwidth = newsender.CurrentVideo.Bandwidth,
                                        videoId = newsender.CurrentVideo.VideoId
                                    }
                            }));
                            newsender.Task.Start();
                        }
                    }
                    break;
                default:
                    break;
            }
        }

        /// <summary>
        /// The method to cancel the current playback if there any
        /// </summary>
        /// <param name="request">the information about the request</param>
        /// <param name="connectionid">the connection identifier to identify the request</param>
        /// <param name="data">the data information sent together with the request</param>
        public void CancelPlayBack(IRequest request, string connectionid, string data)
        {
            var ipAddress = request.GetHttpContext().Request.ServerVariables["REMOTE_ADDR"];
            var RunningTasks = (from task in SenderTasks
                                where task.ConnectionId == connectionid
                                && task.Task.Status == TaskStatus.Running
                                && task.RemoteAddress == ipAddress
                                select task).ToArray();


            for (int i = 0; i < RunningTasks.Count(); i++)
            {
                RunningTasks[i].TokenSource.Cancel();
            }
        }

        /// <summary>
        /// This is the method which will be used to send the streams of videos.
        /// </summary>
        /// <param name="request">Information about the request</param>
        /// <param name="connectionId">The identifier of the connection</param>
        /// <param name="data">the data that comes with the connection</param>
        public void VideoRequest(IRequest request, string connectionId, string data)
        {
            try
            {
                CurrentVideo reqvidObj = JsonConvert.DeserializeObject<CurrentVideo>(data);

                Sender sender = new Sender();
                sender.CurrentId = reqvidObj.StreamId;
                sender.SenderId = reqvidObj.SenderId;
                sender.TokenSource = new CancellationTokenSource();
                sender.Token = sender.TokenSource.Token;
                sender.ConnectionId = connectionId;
                sender.CurrentVideo = reqvidObj;
                sender.RemoteAddress = request.GetHttpContext().Request.ServerVariables["REMOTE_ADDR"];

                sender.Task = new Task(() =>
                {
                    using (VidosaContext Context = new VidosaContext())
                    {
                        // the video to cut and stream
                        Video video = (from vid in Context.Videos.ToList()
                                       where vid.VideoId == reqvidObj.VideoId
                                       select vid).FirstOrDefault();

                        // Set the path file to be streamed
                        if (request.User.Identity.IsAuthenticated)
                        {
                            ApplicationUser applicationUser = (from u in Context.Users.ToList()
                                                               where u.Email == request.User.Identity.Name
                                                               select u).FirstOrDefault();

                            var SalesCustomer = (from s in Context.Sales.ToList()
                                                 where s.CustomerId == applicationUser.UserId && s.ProductId == video.Id
                                                 && s.IsPaid == true
                                                 select s).FirstOrDefault();

                            if (!video.IsFree)
                            {
                                if (SalesCustomer is null)
                                {
                                    if (!video.IsSubscription)
                                    {
                                        reqvidObj.Bandwidth = "Preview";
                                    }
                                    else
                                    {
                                        string email = (from u in Context.Users
                                                        where u.UserId == applicationUser.UserId
                                                        select u).FirstOrDefault().Email;

                                        if (Context.PremiumSubs.Where(p => p.Username == email).FirstOrDefault() is null)
                                        {
                                            reqvidObj.Bandwidth = "Preview";
                                        }
                                    }
                                } 
                            }
                        }
                        else
                        {
                            reqvidObj.Bandwidth = "Preview";
                        }

                        reqvidObj.Path = ServerUtility.MapPath(string.Format("{0}/{1}", video.Path, reqvidObj.Bandwidth));

                        // Load the MPD file that describe the current file
                        var mpdFile = Directory.GetFiles(reqvidObj.Path, "*.mpd").FirstOrDefault();
                        XDocument xDocument = XDocument.Load(mpdFile);

                        // Get the default namespace for the loaded mdf file
                        XNamespace xNamespace = xDocument.Document.Root.GetDefaultNamespace();

                        // Check if the time is greater than zero
                        if (reqvidObj.Start > 0)
                        {
                            // Preparation of the input/output filePaths
                            string filePath = string.Format(ServerUtility.MapPath("{0}/{1}"),
                                    video.Path, reqvidObj.Bandwidth).Replace("\\player\\", "");

                            string inputfileName = string.Format(@"{0}\{1}", reqvidObj.Path, xDocument.Descendants(xNamespace + "BaseURL").FirstOrDefault().Value);

                            string outputDirectory = string.Format(@"{0}/{1}/{2}", filePath,
                                connectionId, reqvidObj.Start);

                            string outputFileName = string.Format("/{0}", xDocument.Descendants(xNamespace + "BaseURL").FirstOrDefault().Value);

                            // Ensure that the ouput directory exists or create it if does not exist
                            if (!Directory.Exists(outputDirectory))
                            {
                                Directory.CreateDirectory(outputDirectory);
                            }
                            else
                            {

                            }
                            // the code to cut the video to the specified time.
                            ProcessStartInfo processStartInfo = new ProcessStartInfo();

                            processStartInfo.FileName = string.Format("{0}", ServerUtility.MapPath("/tools/gpac/mp4box.exe"));
                            processStartInfo.Arguments = string.Format("-splitx {0}:{1} {2} -out {3}",
                                reqvidObj.Start, reqvidObj.End, inputfileName, string.Format("{0}{1}",
                                outputDirectory, outputFileName));
                            processStartInfo.ErrorDialog = false;
                            processStartInfo.RedirectStandardError = false;
                            processStartInfo.RedirectStandardInput = false;
                            processStartInfo.RedirectStandardOutput = false;
                            processStartInfo.WorkingDirectory = outputDirectory;

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
                                        processStartInfo.Arguments = string.Format("-dash 1000 -rap -frag-rap" +
                                            " {0}", string.Format("{0}{1}", outputDirectory, outputFileName));
                                        processStartInfo.WorkingDirectory = outputDirectory;

                                        // Create the Mp4box process to start segmenting the file
                                        process.Start();
                                        process.WaitForExit();

                                        // Ensure that the process has exited
                                        if (process.HasExited)
                                        {
                                            // Switch between the exit code of the process to check its success/failure status
                                            switch (process.ExitCode)
                                            {
                                                case 0:
                                                    // change the directory of the file to stream to the outputDirectory
                                                    reqvidObj.Path = outputDirectory;
                                                    SendStream(request, connectionId, reqvidObj);
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                        break;
                                    case 1:
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                        else
                        {
                            SendStream(request, connectionId, reqvidObj);                            
                        }
                    }
                }, sender.Token);

                Connection.Send(connectionId, JsonConvert.SerializeObject(new
                {
                    function = "errorEncountered",
                    isframe = false,
                    videreq = JsonConvert.SerializeObject(data)
                }));
                SenderTasks.Add(sender);               
            }
            catch (OperationCanceledException operationException)
            {

            }
            catch (Exception e)
            {
                Connection.Send(connectionId, JsonConvert.SerializeObject(new
                {
                    function = "errorEncountered",
                    isframe = false,
                    videreq = JsonConvert.SerializeObject(data)
                }));
            }
        }

        /// <summary>
        /// This is the method to stream to the client.
        /// </summary>
        /// <param name="request">Information about the request</param>
        /// <param name="connectionId">The connectionId of the request</param>
        /// <param name="reqvidObj">Information about the video to stream</param>
        private async void SendStream(IRequest request, string connectionId, CurrentVideo reqvidObj)
        {
            try
            {
                using (VidosaContext Context = new VidosaContext())
                {
                    if (reqvidObj != null)
                    {
                        var mpdFile = Directory.GetFiles(reqvidObj.Path, "*.mpd").FirstOrDefault();
                        
                        // Load the mpd file with all the presentation information for this current video
                        XDocument xDocument = XDocument.Load(mpdFile).Document;
                        XNamespace xNamespace = xDocument.Document.Root.GetDefaultNamespace();

                        // Get the List of Segment containing an information about the 
                        // segment we want to send.
                        List<XElement> segments = (from segUrl in xDocument.Descendants(xNamespace + "SegmentURL")
                                                   select segUrl).ToList();
                        

                        for (int i = 0; i < segments.Count; i++)
                        {
                            segments[i].SetAttributeValue("segIndex", i + 1);
                        }

                        var vidfilePath = string.Format("{0}/{1}", reqvidObj.Path, xDocument.Descendants(xNamespace + "BaseURL").FirstOrDefault().Value);

                        // Generate a unique identifier for the streams

                        // Create an instance of CurrentVideo class to hold the information for streams to send.
                        CurrentVideo currentVideo = new CurrentVideo()
                        {
                            Bandwidth = reqvidObj.Bandwidth,
                            End = reqvidObj.End,
                            Start = reqvidObj.Start,
                            VideoId = reqvidObj.VideoId,
                            StreamId = reqvidObj.SenderId,
                            SenderId = reqvidObj.SenderId
                        };
                        
                        // Open the Stream File
                        using (Stream stream = File.Open(vidfilePath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
                        {
                            // Send the Initialization segment
                            XElement init = (from ini in xDocument.Descendants(xNamespace + "Initialization")
                                             select ini).FirstOrDefault();

                            int start = Convert.ToInt32(init.Attribute("range").Value.Split('-')[0]);
                            int end = Convert.ToInt32(init.Attribute("range").Value.Split('-')[1]);
                            byte[] iniBytes = new byte[end - start];

                            stream.Read(iniBytes, 0, iniBytes.Length);

                            // update the initialization value to true and Content property to the content
                            // read from the stream.
                            currentVideo.Content = new List<byte>(iniBytes);
                            currentVideo.IsInitialization = true;
                            currentVideo.SegIndex = 0;
                            await Connection.Send(connectionId,
                                    JsonConvert.SerializeObject(new
                                    {
                                        currentvideo = currentVideo,
                                        function = "vidseg",
                                        isframe = true,
                                    }));
                            
                            foreach (XElement element in segments)
                            {
                                var RunningTask = (from task in SenderTasks
                                                   where task.ConnectionId == connectionId
                                                   && task.Task.Status == TaskStatus.Running
                                                   select task).FirstOrDefault();

                                bool istaskCanceled = RunningTask != null ? RunningTask.TokenSource.IsCancellationRequested : false;
                                if (istaskCanceled)
                                {
                                    SenderTasks.Remove(RunningTask);
                                    break;
                                }

                                start = Convert.ToInt32(element.Attribute("mediaRange").Value.Split('-')[0]);
                                end = Convert.ToInt32(element.Attribute("mediaRange").Value.Split('-')[1]);

                               
                                long byteLength = end - start;
                                byte[] fileBytes = new byte[byteLength];

                                stream.Read(fileBytes, 0, fileBytes.Length);

                                if (Convert.ToInt32(element.Attribute("segIndex").Value) == segments.Count())
                                {
                                    currentVideo.IsLastSegment = true;
                                }

                                // update isInitialization to false
                                currentVideo.IsInitialization = false;
                                currentVideo.SegIndex = Convert.ToInt32(element.Attribute("segIndex").Value);

                                // Subsegment the data
                                int bytesIndex = 0;
                                bool isLastsubsegment = false;
                                while (bytesIndex < fileBytes.Length && !istaskCanceled)
                                {
                                    var _byteData =
                                        fileBytes.Length - bytesIndex <= 1024 ?
                                        fileBytes.Skip(bytesIndex).Take(fileBytes.Length - bytesIndex).ToList() :
                                        fileBytes.Skip(bytesIndex).Take(1024).ToList();

                                    istaskCanceled = RunningTask != null ? RunningTask.TokenSource.IsCancellationRequested : false;
                                    if (istaskCanceled)
                                    {
                                        SenderTasks.Remove(RunningTask);
                                        break;
                                    }

                                    if (bytesIndex + _byteData.Count() >= fileBytes.Count())
                                    {
                                        isLastsubsegment = true;
                                    }
                                    
                                    // Assign The Content
                                    currentVideo.Content = _byteData;
                                    await Connection.Send(connectionId,
                                                        JsonConvert.SerializeObject(new
                                                        {
                                                            currentvideo = currentVideo,
                                                            function = "vidseg",
                                                            isframe = true,
                                                            isLastsubsegment = isLastsubsegment
                                                        }));

                                    bytesIndex +=
                                        _byteData.Count + bytesIndex < fileBytes.Count() ?
                                        1024 : _byteData.Count();

                                    Thread.Sleep(1);
                                }
                                istaskCanceled = RunningTask != null ? RunningTask.TokenSource.IsCancellationRequested : false;
                                if (istaskCanceled)
                                {
                                    SenderTasks.Remove(RunningTask);
                                    break;
                                }
                            }

                            for (int i = 0; i < SenderTasks.Count; i++)
                            {
                                if (SenderTasks[i].Task.Status ==  TaskStatus.RanToCompletion || 
                                    SenderTasks[i].Task.IsCanceled)
                                {
                                    SenderTasks.Remove(SenderTasks[i]);
                                }
                            }
                        }
                    }
                }
            }
            catch (OperationCanceledException operationException)
            {
                
            }
            catch (Exception exception)
            {
                
            }
        }
    }
}