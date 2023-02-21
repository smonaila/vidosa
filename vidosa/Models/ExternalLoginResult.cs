using Microsoft.AspNet.Membership.OpenAuth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace vidosa.Models
{
    public class ExternalLoginResult : ActionResult
    {
        public string Provider { get; set; }
        public string ReturnUrl { get; set; }

        public ExternalLoginResult(string provider, string returnUrl)
        {
            Provider = provider;
            ReturnUrl = returnUrl;
        }

        public override void ExecuteResult(ControllerContext context)
        {
            OpenAuth.RequestAuthentication(Provider, ReturnUrl);
        }
    }
}