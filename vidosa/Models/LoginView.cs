using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace vidosa.Models
{
    [NotMapped]
    public class LoginView
    {
        [ScaffoldColumn(false)]
        public int Id { get; set; }

        [Required(ErrorMessage ="username is required")]
        [EmailAddress(ErrorMessage ="Invaliid Email address")]
        public string Username { get; set; }

        [DataType(DataType.Password)]
        [Required(ErrorMessage ="Password is required")]
        public string Password { get; set; }

        public bool RememberMe { get; set; }
    }
}