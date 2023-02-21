using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace vidosa.Models
{
    public class Video
    {
        [ScaffoldColumn(false)]
        public int Id { get; set; }
        public string VideoId { get; set; }
        public string Title { get; set; }
        public string Thumb { get; set; }
        public DateTime DatePublished { get; set; }
        public string Path { get; set; }
        public string Url { get; set; }
        public string Description { get; set; }

        
        public string UserId { get; set; }

        [ScaffoldColumn(false)]
        public decimal Price { get; set; }

        [NotMapped]
        [ScaffoldColumn(false)]
        public string Duration { get; set; }

        [NotMapped]
        [ScaffoldColumn(false)]
        public int Width { get; set; }

        [NotMapped]
        [ScaffoldColumn(false)]
        public int Height { get; set; }

        public bool IsSubscription { get; set; }
        public bool IsFree { get; set; }

        [NotMapped]
        public string VideoDetails { get; set; }
    }

    public class VideoDetails
    {
        public int Id { get; set; }

        public string VideoId { get; set; }
        public string HtmlContent { get; set; }
    }

    // This is the class that will contain information about the SEO
    public class SEO
    {
        public int Id { get; set; }
        public string VideoId { get; set; }
        public string Blurb { get; set; }
        public string Description { get; set; }
        public string Keywords { get; set; }
    }

    // A type to represent the likes
    public class Reactions
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public ReactionType Reaction { get; set; }
        public ContentType ContentType { get; set; }
        public string ContentId { get; set; }
    }

    // ReactionType
    public enum ContentType
    {
        Comment=1,
        Video=2
    }

    // A class that will hold the number of views.
    public class VideoViews
    {
        public int Id { get; set; }
        public string VideoId { get; set; }
        public string UserName { get; set; }
        public string IPAddress { get; set; }
    }

    // A type to store ReactionType and ViewsCounter
    public class ViewsCounter
    {
        public int Likes { get; set; }
        public int UnLikes { get; set; }
        public int Views { get; set; }

        public ViewsCounter GetViewsCounter(string videoId)
        {
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    Video video = (from v in vidosaContext.Videos where v.VideoId == videoId select v).FirstOrDefault();
                    List<Reactions> VideoReactions = vidosaContext.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Video))).ToList();
                    List<Reactions> CommentReactions = vidosaContext.Reactions.Where(r => ((r.ContentId == video.VideoId) && (r.ContentType == ContentType.Comment))).ToList();

                    ViewsCounter viewsCounter = new ViewsCounter();
                    viewsCounter.Likes = VideoReactions.Where(r => r.Reaction == ReactionType.Like).ToList().Count;
                    viewsCounter.UnLikes = VideoReactions.Where(r => r.Reaction == ReactionType.Unlike).ToList().Count;

                    viewsCounter.Views = (from view in vidosaContext.VideoViews
                                          where view.VideoId == video.VideoId
                                          select view).ToList().Count;

                    return viewsCounter;
                }
            }
            catch (Exception)
            {
                throw;
            }
        }
    }

    

    // Enum for the types of reactions.
    public enum ReactionType
    {
        Like=1,
        Unlike=2,
        Love=3
    }
}