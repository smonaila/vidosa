using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using vidosa.Controllers;

namespace vidosa.Models
{
    // Keeps track of the User Search Options
    public class SearchConfig
    {
        public bool videos { get; set; }
        public bool blog_posts { get; set; }
        public bool all { get; set; }
        public string squery { get; set; }
    }

    // A model to model a set of matching results
    public class SearchResults
    {
        public string Title { get; set; }
        public string Blurb { get; set; }
        public string Content { get; set; }
        public string Thumb { get; set; }
        public string UrlId { get; set; }
        public string Duration { get; set; }
        public string UserId { get; set; }
        public bool IsPost { get; set; }
        public DateTime Date { get; set; }

        public List<SearchResults> GetSearchResults(HttpRequestBase requestBase)
        {
            SearchConfig searchOptions = new SearchConfig();
            List<SEO> videoSEOs = new List<SEO>();
            List<VideoDetails> videoDetails = new List<VideoDetails>();
            List<Post> posts = new List<Post>();
            List<SearchResults> searchResults = new List<SearchResults>();

            try
            {
                using (VidosaContext Context = new VidosaContext())
                {

                    // Get the QueryString Collection and update the searchOptions object accordingly
                    Action<NameValueCollection> setSearchOptions = (serOptions) =>
                    {
                        bool allOptions = 
                        (serOptions.AllKeys.ToList().Exists(a => a.Equals("videos")) || serOptions.AllKeys.ToList().Exists(a => a.Equals("select_url_videos"))) && (serOptions.AllKeys.ToList().Exists(a => a.Equals("blog_posts")) || serOptions.AllKeys.ToList().Exists(a => a.Equals("select_url_blog_posts"))) ? true : false;

                        bool Is_Vblog = (serOptions.AllKeys.ToList().Exists(a => a.Equals("videos")) || serOptions.AllKeys.ToList().Exists(a => a.Equals("select_url_videos"))) ? true : false;

                        bool Is_Pblog = (serOptions.AllKeys.ToList().Exists(a => a.Equals("blog_posts")) || serOptions.AllKeys.ToList().Exists(a => a.Equals("select_url_blog_posts"))) ? true : false;

                        if (allOptions)
                        {
                            searchOptions.all = true;
                        }
                        if (Is_Vblog)
                        {
                            searchOptions.videos = true;
                        }
                        if (Is_Pblog)
                        {
                            searchOptions.blog_posts = true;
                        }                        
                        searchOptions.squery = requestBase.QueryString["searchbar"] is null ? requestBase.QueryString["select-url-form"] : requestBase.QueryString["searchbar"];
                    };
                    setSearchOptions(requestBase.QueryString);

                    // A function to do all the searching
                    Func<List<SearchResults>> func = () =>
                    {
                        List<Video> videos = new List<Video>();
                        if (searchOptions.all)
                        {
                            var PostTitles = (from t in Context.Posts.ToList()
                                          select new
                                          {
                                              PostId = t.PostKey,
                                              PostTitle = t.Title
                                          }).ToList();
                            var VideoTitles = (from t in Context.Videos.ToList()
                                               select new
                                               {
                                                   VideoTitle = t.Title,
                                                   VideoId = t.VideoId
                                               }).ToList();

                            string[] WordsToMatch = searchOptions.squery.Trim().ToLower().Split(new char[] { '.', ' ' });

                            var matchingTitles = (from title in PostTitles
                                                  let words = title.PostTitle.ToLower().Split(new char[] { '.', ' ' })
                                                  where WordsToMatch.Length > 1 ? words.Distinct().Intersect(WordsToMatch).ToList().Count() >= 1 :
                                                  ((from w in words
                                                    where string.Compare(WordsToMatch[0], w.Length > WordsToMatch[0].Length ? w.Substring(0, WordsToMatch[0].Length) : w.Substring(0, w.Length), StringComparison.OrdinalIgnoreCase) == 0
                                                    select w).ToList().Count > 0)
                                                  select title);

                            var matchingVTitles = (from title in VideoTitles                                                   
                                      let words = title.VideoTitle.ToLower().Trim().Split(new char[] { '.', ' ' })
                                      where (WordsToMatch.Length > 1 ? words.Distinct().Intersect(WordsToMatch).ToList().Count() >= 1 :
                                      ((from w in words
                                        where string.Compare(WordsToMatch[0], w.Length > WordsToMatch[0].Length ? w.Substring(0, WordsToMatch[0].Length) : w.Substring(0, w.Length), StringComparison.OrdinalIgnoreCase) == 0
                                        select w).ToList().Count() > 0))
                                      select title).ToList();

                            videos = (from v in Context.Videos.ToList()
                                      from mt in matchingVTitles
                                      where mt.VideoId == v.VideoId
                                      select v).ToList();

                            videoDetails = (from v in Context.VideoDetails select v).ToList();

                            for (int i = 0; i < videos.Count; i++)
                            {
                                videos[i].VideoDetails = videoDetails.Find(v => v.VideoId == videos[i].VideoId).HtmlContent;
                                searchResults.Add(new SearchResults() { Blurb = videos[i].Description, Content = videos[i].VideoDetails, IsPost = false, Title = videos[i].Title, Thumb = videos[i].Thumb, Duration = videos[i].Duration, UrlId = videos[i].VideoId, UserId = videos[i].UserId, Date = videos[i].DatePublished });
                            }

                            posts = (from mt in matchingTitles
                                     from p in Context.Posts.ToList()
                                     where mt.PostId == p.PostKey
                                     select p).ToList();

                            var relatedPosts = Context.Posts.ToList();

                            for (int i = 0; i < posts.Count; i++)
                            {
                                searchResults.Add(new SearchResults() { Blurb = posts[i].Blurb, Content = posts[i].Content, IsPost = true, Thumb = posts[i].ThumbUrl, Title = posts[i].Title, UrlId = posts[i].PostUrl, UserId = posts[i].UserId, Date = posts[i].DateUpdated });
                            }
                        }

                    // if only the videos checked 
                    if (searchOptions.videos && !searchOptions.all)
                        {
                            var VideoTitles = (from t in Context.Videos.ToList()
                                               select new
                                               {
                                                   VideoTitle = t.Title,
                                                   VideoId = t.VideoId
                                               });

                            string[] WordsToMatch = searchOptions.squery.Split(new char[] { '.', ' ' });

                            var matchingVTitles = (from title in VideoTitles
                                                   let words = title.VideoTitle.Split(new char[] { '.', ' ' })
                                                   where WordsToMatch.Length > 1 ? words.Distinct().Intersect(WordsToMatch).Count() >= 1 :
                                                   ((from w in words
                                                     where string.Compare(WordsToMatch[0], w.Length > WordsToMatch[0].Length ? w.Substring(0, WordsToMatch[0].Length) : w.Substring(0, w.Length), StringComparison.OrdinalIgnoreCase) == 0
                                                     select w).ToList().Count() > 0)
                                                   select title);

                            videos = (from v in Context.Videos.ToList()
                                      from mt in matchingVTitles
                                      where mt.VideoId == v.VideoId
                                      select v).ToList();

                            videoDetails = (from v in Context.VideoDetails select v).ToList();

                            for (int i = 0; i < videos.Count; i++)
                            {
                                videos[i].VideoDetails = videoDetails.Find(v => v.VideoId == videos[i].VideoId).HtmlContent;
                                searchResults.Add(new SearchResults() { Blurb = videos[i].Description, Content = videos[i].VideoDetails, IsPost = false, Title = videos[i].Title, Thumb = videos[i].Thumb, UrlId = videos[i].VideoId, Duration = videos[i].Duration, Date = videos[i].DatePublished });
                            }
                        }

                    // if only the blog_posts checked
                    if (searchOptions.blog_posts && !searchOptions.all)
                        {
                            var titles = (from t in Context.Posts.ToList()
                                               select new
                                               {
                                                   PostId = t.PostKey,
                                                   PostTitle = t.Title
                                               });

                            string[] WordsToMatch = searchOptions.squery.Split(new char[] { '.', ' ' });

                            var matchingTitles = (from title in titles
                                                  let words = title.PostTitle.Split(new char[] { '.', ' ' })
                                                  where WordsToMatch.Length > 1 ? words.Distinct().Intersect(WordsToMatch).Count() >= 1 :
                                                  ((from w in words
                                                    where string.Compare(WordsToMatch[0], w.Length > WordsToMatch[0].Length ? w.Substring(0, WordsToMatch[0].Length) : w.Substring(0, w.Length), StringComparison.OrdinalIgnoreCase) == 0
                                                    select w).ToList().Count > 0) select title);
                                                 
                            posts = (from mt in matchingTitles
                                     from p in Context.Posts.ToList()
                                     where mt.PostId == p.PostKey
                                     select p).ToList();

                            for (int i = 0; i < posts.Count; i++)
                            {
                                searchResults.Add(new SearchResults() { Blurb = posts[i].Blurb, Content = posts[i].Content, IsPost = true, Thumb = posts[i].ThumbUrl, Title = posts[i].Title, UrlId = posts[i].PostUrl, Date = posts[i].DateUpdated });
                            }
                        }
                        searchResults.OrderBy(r => r.Date).Take(searchResults.Count <= 10 ? searchResults.Count : 10);
                        return searchResults;
                    };                    
                    return func();
                }
            }
            catch (Exception exception)
            {
                throw new Exception(exception.ToString());
            }            
        }
    }
}