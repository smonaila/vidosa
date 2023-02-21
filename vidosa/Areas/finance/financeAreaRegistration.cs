using System.Web.Mvc;

namespace vidosa.Areas.finance
{
    public class financeAreaRegistration : AreaRegistration 
    {
        public override string AreaName 
        {
            get 
            {
                return "finance";
            }
        }

        public override void RegisterArea(AreaRegistrationContext context) 
        {
            context.MapRoute(
                "finance_default",
                "finance/{controller}/{action}/{id}",
                new { action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}