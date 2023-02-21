using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace vidosa.Areas.admin.Models
{   
    public class PostSEOView
    {
        [Key]
        [ScaffoldColumn(false)]
        public int Id { get; set; }

        public string PostKey { get; set; }
        public string Title { get; set; }
        public string Keywords { get; set; }
        public string HtmlCode { get; set; }
        public string Blurb { get; set; }
    }

    public class UploadFileView
    {
        [Key]
        [ScaffoldColumn(false)]
        public int Id { get; set; }

        public string VideoId { get; set; }
        public string Title { get; set; }
        public string Url { get; set; }
        public string Keywords { get; set; }
        public string Blurb { get; set; }
        public string HtmlCode { get; set; }
    }
}