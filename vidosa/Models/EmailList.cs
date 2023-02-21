using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace vidosa.Models
{
    public class EmailList
    {
        [Key]
        [ScaffoldColumn(false)]
        public int EmailId { get; set; }
        
        [ScaffoldColumn(false)]
        public string IpAddress { get; set; }

        public string EmailAddress { get; set; }
        public string FirstName { get; set; }
        [ScaffoldColumn(false)]
        public bool IsActive { get; set; }
        [ScaffoldColumn(false)]
        public string ActivationCode { get; set; }

        [DataType(DataType.Password)]
        public string Password { get; set; }

        [DataType(DataType.Password)]
        [Compare("Password")]
        [NotMapped]
        [ScaffoldColumn(true)]
        public string ConfirmPassword { get; set; }

        public DateTime SubDate { get; set; } 
    }
}