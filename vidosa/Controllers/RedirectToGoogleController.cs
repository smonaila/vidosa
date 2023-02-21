using DotNetOpenAuth.GoogleOAuth2;
using Microsoft.AspNet.Membership.OpenAuth;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using vidosa.Models;

namespace vidosa.Controllers
{
    public class RedirectToGoogleController : Controller
    {
        // GET: RedirectToGoogle
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult RedirectToGoogle()
        {
            string provider = "google";
            string returnUrl = "";
            return new ExternalLoginResult(provider, Url.Action("ExternalLoginCallback", new { ReturnUrl = returnUrl }));
        }

        public ActionResult ExternalLoginCallback(string returnUrl)
        {
            string ProviderName = OpenAuth.GetProviderNameFromCurrentRequest();
            if (ProviderName == null || ProviderName == "")
            {
                NameValueCollection nvs = Request.QueryString;
                if (nvs.Count > 0)
                {
                    if (nvs["state"] != null)
                    {
                        NameValueCollection providerItem = HttpUtility.ParseQueryString(nvs["state"]);
                        if (providerItem["__provider__"] != null)
                        {
                            ProviderName = providerItem["__provider__"];
                        }
                    }
                }
            }
            var redirectUrl = Url.Action("ExternalLoginCallback",
                new
                {
                    ReturnUrl = returnUrl
                });
            var retUrl = returnUrl;
            GoogleOAuth2Client.RewriteRequest();
            var authRequest = OpenAuth.VerifyAuthentication(redirectUrl);

            if (!authRequest.IsSuccessful)
            {
                return Redirect(Url.Action("Account", "Login"));
            }

            // User has logged in with provider successfully,
            // check if user is already registered locally
            // You can call your user data access method to check and create based on your model

            if (OpenAuth.Login(authRequest.Provider, authRequest.ProviderUserId, createPersistentCookie: false))
            {
                return Redirect(Url.Action("Index", "Home"));
            }

            // Get provider user details
            string ProviderUserId = authRequest.ProviderUserId;
            string ProviderUserName = authRequest.UserName;

            string Email = null;
            if (Email == null && authRequest.ExtraData.ContainsKey("email"))
            {
                Email = authRequest.ExtraData["email"];
            }

            if (User.Identity.IsAuthenticated)
            {
                // User is already authenticated, add the external login and redirect to return url
                OpenAuth.AddAccountToExistingUser(ProviderName, ProviderUserId, ProviderUserName, User.Identity.Name);
                return Redirect(Url.Action("Index", "Home"));
            }
            else
            {
                // User is new, save email as username
                string membershipUserName = Email ?? ProviderUserId;
                var createResult = OpenAuth.CreateUser(ProviderName, ProviderUserId, ProviderUserName, membershipUserName);

                if (!createResult.IsSuccessful)
                {
                    ViewBag.Message = "User cannot be create";
                    return View();
                }
                else
                {
                    // User created
                    if (OpenAuth.Login(ProviderName, ProviderUserId, createPersistentCookie: false))
                    {
                        return Redirect(Url.Action("Index", "Home"));
                    }
                }
            }
            return View();
        }
    }
}