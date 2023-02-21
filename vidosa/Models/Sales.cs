using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Transactions;
using System.Web;
using vidosa.Areas.finance.Models;

namespace vidosa.Models
{
    public class Sales
    {
        [Key]
        public int SaleId { get; set; }
        public int CustomerId { get; set; }
        public int ProductId { get; set; }
        public string PaymentId { get; set; }
        public bool IsPaid { get; set; }

        public virtual ICollection<Transactions> Transactions { get; set; }
    }
}