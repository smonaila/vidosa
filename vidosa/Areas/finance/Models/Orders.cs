using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace vidosa.Areas.finance.Models
{
    public class Orders
    {
        [Key]
        public int OrderId { get; set; }
        public int CustId { get; set; }
        public int ProductId { get; set; }
        public string PaymentId { get; set; }
        public string pf_PaymentId { get; set; }
        public bool IsSubscription { get; set; }
        public bool IsPaid { get; set; }
        public string ItemName { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal AmountFee { get; set; }
        public decimal AmountNet { get; set; }
        public string PaymentStatus { get; set; }
        public DateTime? OrderDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string Token { get; set; }
    }
}