using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace vidosa.Areas.admin.Models
{
    public class Log
    {
        public int Id { get; set; }
        public string UrlId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }
        
        public enum Type { all = 1, video, post }

        public bool IsPost { get; set; }
        public bool IsDeleted { get; set; }
    }
}