using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Script.Serialization;
using DotNetOpenAuth.OpenId.Provider;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.AspNet.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Owin;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Cookies;
using Microsoft.Owin.Security.Google;
using Owin;
using System.Linq;
using System.Collections.Specialized;
using Newtonsoft.Json;
using Microsoft.AspNet.SignalR.Infrastructure;
using static vidosa.Models.TaskCollection;

[assembly: OwinStartup(typeof(vidosa.Models.Startup))]
namespace vidosa.Models
{
    public class Sender
    {
        public string SenderId { get; set; }
        public string CurrentId { get; set; }
        public string ConnectionId { get; set; }
        public Task Task { get; set; }
        public CurrentVideo CurrentVideo { get; set; }
        public CancellationToken Token { get; set; }
        public CancellationTokenSource TokenSource { get; set; }
        public StreamStatus StreamStatus { get; set; }
        public string RemoteAddress { get; set; }
    }

    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.CreatePerOwinContext(ApplicationDbContext.Create);
            app.CreatePerOwinContext<ApplicationUserManager>(ApplicationUserManager.Create);
            app.CreatePerOwinContext<ApplicationSignInManager>(ApplicationSignInManager.Create);
            app.CreatePerOwinContext(TaskCollection.Create);

            app.UseCookieAuthentication(new CookieAuthenticationOptions()
            {
                AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie,
                Provider = new CookieAuthenticationProvider
                {
                    OnValidateIdentity = SecurityStampValidator.OnValidateIdentity<ApplicationUserManager, ApplicationUser>(validateInterval: TimeSpan.FromMinutes(30),
                    regenerateIdentity: (manager, user) => user.GenerateUserIdentityAsync(manager)),
                    OnResponseSignedIn = context =>
                    {
                        HeaderDictionary headerCollection = (HeaderDictionary)context.Response.Headers;
                        Debug.WriteLine("Items on the collection after SignedIn");
                        IList<string> c = headerCollection.GetValues("Set-Cookie");
                        string[] ca = new string[c.Count];
                        c.CopyTo(ca, 0);
                        List<string> cl = new List<string>() { ca[0], ca[1] };
                        string login = cl.Find(aspc => aspc.Split('=')[0].Equals("aspnetCookies"));

                        var cv = login.Split('=')[1].Split(';')[0].Replace("-", "");

                        // context.Response.Cookies.Delete("", options:);
                        // context.Response.Cookies.Delete("aspnetCookies");
                        // context.Response.Cookies.Append("aspnetCookies", cv);
                        // string[] cookieCollection = (headerCollection.GetValues("Set-Cookie"));
                        // Debug.WriteLine("aspnetCookies={0}", cookieCollection.Find(c => c.Equals("aspnetCookies")).Split('=')[1]);
                    },
                    OnResponseSignIn = context =>
                    {
                        HeaderDictionary headerCollection = (HeaderDictionary)context.Response.Headers;
                        Debug.WriteLine("Items on the collection before SignIn");

                        Debug.WriteLine("Items on the collection after SignedIn");
                        string c = headerCollection.Get("Set-Cookie");
                    },
                    OnApplyRedirect = context =>
                    {
                        // Dictionary<string, string> headerCollection = (Dictionary<string, string>)context.Response.Headers;
                        // Debug.WriteLine("Items on the collection before SignIn");
                    }
                },
                CookieName = "aspnetCookies",
                CookieHttpOnly = false,
                TicketDataFormat = new CustomDataProtector(),
            });
            app.UseExternalSignInCookie(DefaultAuthenticationTypes.ExternalCookie);
            app.UseFacebookAuthentication(appId: "1706472059533802", appSecret: "9b8927c34e6f898fa35f9639151fa7f3");
            app.UseGoogleAuthentication(new GoogleOAuth2AuthenticationOptions()
            {
                ClientId = "984033550758-9hra27c065t2j9mip87h05earrcgnvor.apps.googleusercontent.com",
                ClientSecret = "x-uZTkH5dUeRglxNpkaBiUok"
            });

            // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=316888
            IAppBuilder IappBuilder = app.MapSignalR<VidosaConnection>("/player");

            GlobalHost.Configuration.DefaultMessageBufferSize = 3000;
            var Context = GlobalHost.ConnectionManager.GetConnectionContext<VidosaConnection>();
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // services.AddAuthentication()
        }
    }

    public class CustomDataProtector : ISecureDataFormat<AuthenticationTicket>
    {
        public CustomDataProtector()
        {
        }

        public AuthenticationTicket Unprotect(string protectedText)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    JavaScriptSerializer scriptSerializer = new JavaScriptSerializer();

                    byte[] keyArray = UTF8Encoding.UTF8.GetBytes("kjcdgrdkrayerodf");
                    byte[] toEncryptArray = Convert.FromBase64String(protectedText);

                    TripleDESCryptoServiceProvider tripleDES = new TripleDESCryptoServiceProvider();
                    tripleDES.Key = keyArray;
                    tripleDES.Mode = CipherMode.ECB;
                    tripleDES.Padding = PaddingMode.PKCS7;

                    ICryptoTransform cryptoTransform = tripleDES.CreateDecryptor();
                    byte[] resultArray = cryptoTransform.TransformFinalBlock(toEncryptArray, 0, toEncryptArray.Length);
                    string str = Encoding.ASCII.GetString(resultArray);

                    Principal principal = (Principal)scriptSerializer.Deserialize(str, typeof(Principal));
                    PrincipalIdentity principalIdentity = new PrincipalIdentity();
                    principalIdentity.AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie;
                    principalIdentity.IsAuthenticated = true;
                    principalIdentity.Name = principal.Username;
                    principal.Identity = principalIdentity;

                    HttpContext.Current.User = principal;

                    ClaimsIdentity claimsIdentity = new ClaimsIdentity(principalIdentity);
                    AuthenticationTicket authenticationTicket = new AuthenticationTicket(claimsIdentity, new AuthenticationProperties() { IsPersistent = true });

                    return authenticationTicket;
                }
                catch (Exception ex)
                {
                    throw ex;
                }
            }
        }

        private PrincipalIdentity AuthenticateBot(Bot bot)
        {
            using (VidosaContext vidosaContext = new VidosaContext())
            {
                try
                {
                    Principal principal = new Principal();
                    principal.FirstName = bot.GetName;
                    principal.LastName = bot.GetName;
                    principal.Username = bot.Username;
                    
                    PrincipalIdentity principalIdentity = new PrincipalIdentity();
                    principalIdentity.AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie;
                    principalIdentity.IsAuthenticated = true;
                    principalIdentity.Name = principal.Username;
                    principal.Identity = principalIdentity;

                    HttpContext.Current.User = principal;
                    return principalIdentity;
                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        string ISecureDataFormat<AuthenticationTicket>.Protect(AuthenticationTicket data)
        {
            string EncryptedCookie = string.Empty;
            try
            {
                using (VidosaContext vidosaContext = new VidosaContext())
                {
                    var userIdentity = data.Identity;
                    var userId = userIdentity.GetUserId();

                    ApplicationUser applicationUser = vidosaContext.Users.Find(userId);

                    Principal principal = new Principal();
                    PrincipalIdentity principalIdentity = new PrincipalIdentity();

                    principalIdentity.Name = applicationUser.Email;

                    principal.FirstName = applicationUser.FirstName;
                    principal.LastName = applicationUser.LastName;
                    principal.Id = applicationUser.Id;
                    principal.Username = applicationUser.Email;

                    JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
                    string _data = javaScriptSerializer.Serialize(principal);

                    byte[] keyArray = Encoding.UTF8.GetBytes("kjcdgrdkrayerodf");
                    byte[] toEncryptArray = Encoding.UTF8.GetBytes(_data);

                    TripleDESCryptoServiceProvider tripleDES = new TripleDESCryptoServiceProvider();
                    tripleDES.Key = keyArray;
                    tripleDES.Mode = CipherMode.ECB;
                    tripleDES.Padding = PaddingMode.PKCS7;

                    ICryptoTransform cryptoTransform = tripleDES.CreateEncryptor();
                    byte[] resultArray = cryptoTransform.TransformFinalBlock(toEncryptArray, 0, toEncryptArray.Length);

                    EncryptedCookie = Convert.ToBase64String(resultArray, 0, resultArray.Length);
                    return EncryptedCookie;
                }
            }
            catch (Exception)
            {
                throw;
            }
        }
    }

    public class Principal : IPrincipal
    {
        public IIdentity Identity { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Id { get; set; }
        public string Username { get; set; }

        public bool IsInRole(string role)
        {
            throw new NotImplementedException();
        }
    }

    public class PrincipalIdentity : IIdentity
    {
        public string Name { get; set; }
        public string AuthenticationType { get; set; }
        public bool IsAuthenticated { get; set; }
    }
}
