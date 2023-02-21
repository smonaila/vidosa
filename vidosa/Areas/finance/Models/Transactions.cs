using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using vidosa.Models;

namespace vidosa.Areas.finance.Models
{
    public class Transactions
    {
        [Key]
        public int TransId { get; set; }
        public decimal GrossAmount { get; set; }
        public string PaymentId { get; set; }
        public string pf_PaymentId { get; set; }
        public decimal AmountFee { get; set; }
        public decimal AmountNet { get; set; }
        public DateTime TransDate { get; set; }
        public string TransStatus{ get; set; }

        public virtual ICollection<Sales> Sales { get; set; }
        public virtual ICollection<PremiumSubs> PremiumSubs { get; set; }

        public int UserId { get; set; }
    }
}