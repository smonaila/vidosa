using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace vidosa.Models
{
    public class EditProfileView : RegistrationView
    {
        public DateTime AccCrtDate { get; set; }
        public bool EmailConfirmed { get; set; }
        public string PhoneNumber { get; set; }
        public bool PhoneNumberConfirmed { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public DateTime? LockoutEndDateUtc { get; set; }
        public bool LockoutEnabled { get; set; }
        public int AccessFailedCount { get; set; }
    }

    public class RegistrationView
    {
        [Key]
        [ScaffoldColumn(false)]
        public int Id { get; set; }

        [Required(ErrorMessage = "Please enter a valid email")]
        [DataType(DataType.EmailAddress)]
        public string Username { get; set; }
        [Required(ErrorMessage = "Please enter a valid email")]
        [Compare("Username", ErrorMessage ="Email do not match the username")]
        [DataType(DataType.EmailAddress)]
        public string Email { get; set; }
        [Required(ErrorMessage ="Your first name is required")]
        public string FirstName { get; set; }
        [Required(ErrorMessage = "Your last name is required")]
        public string LastName { get; set; }

        [DataType(DataType.Password)]
        [DisplayName("Password")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Password is required")]
        [DataType(DataType.Password)]
        [DisplayName("Confirm Password")]
        [Compare("Password", ErrorMessage ="Password do not match")]
        public string ConfirmPassword { get; set; }

        [ScaffoldColumn(false)]
        public object ActivationCode { get; set; }

        public bool RememberMe { get; set; }
    }

    public class NewsLetterView
    {
        [Required(ErrorMessage = "First Name is is required")]
        [MaxLength(20, ErrorMessage = "The name is too long only a max of 20 characters is allows")]
        [DataType(DataType.Text)]
        public string FirstName { get; set; }

        [Required(ErrorMessage = "Email is required")]
        [DataType(DataType.EmailAddress, ErrorMessage = "Wrong Email format")]
        public string Email { get; set; }
    }

    public class ContactView
    {
        [Required(ErrorMessage = "FirstName is required")]
        public string FirstName { get; set; }

        [Required(ErrorMessage = "Email is required")]
        [DataType(DataType.EmailAddress, ErrorMessage = "Email address is wrong")]
        public string Email { get; set; }

        [MaxLength(200, ErrorMessageResourceType = typeof(ContactView), ErrorMessageResourceName = "Message")]
        [MinLength(50, ErrorMessageResourceType = typeof(ContactView), ErrorMessageResourceName = "Message")]
        public string Message { get; set; }
    }
}