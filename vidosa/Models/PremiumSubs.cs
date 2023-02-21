using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Transactions;
using System.Web;
using vidosa.Areas.finance.Models;

namespace vidosa.Models
{
    public class PremiumSubs
    {
        [Key]
        public int Id { get; set; }
        public string Username { get; set; }
        public string Token { get; set; }
        public bool IsActive { get; set; }
        
        public virtual ICollection<Transactions> Transactions { get; set; }
    }

    public class ChannelSubs
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string ChannelId { get; set; }
    }
}