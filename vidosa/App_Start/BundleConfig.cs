using System.Web;
using System.Web.Optimization;

namespace vidosa
{
    public class BundleConfig
    {
        // For more information on bundling, visit https://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.validate*"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at https://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css"));

            // My Custom Bundles

            // Scripts Bundles
            bundles.Add(new ScriptBundle("~/_scripts/customs")
                .Include("~/Scripts/customs/history.js")
                .Include("~/Scripts/customs/conmanager.js")
                .Include("~/Scripts/customs/pace.js")
                .Include("~/Content/customs/customs.js"));

            // Player Frame Scripts
            bundles.Add(new ScriptBundle("~/scripts/iframe/customs")
                .Include("~/Scripts/jquery-3.3.1.min.js")
                .Include("~/Scripts/bootstrap.min.js")
                .Include("~/Scripts/customs/player_worker.js")
                .Include("~/Scripts/customs/player.js"));

            // Player Frame Styles
            bundles.Add(new StyleBundle("~/css/iframe/customs")
                .Include("~/content/jquery-ui.css")
                .Include("~/content/customs/playerstyles.css"));

            // Scripts for the plugins
            bundles.Add(new ScriptBundle("~/scripts/plugins")
                .Include("~/scripts/jquery-3.3.1.min.js")      
                .Include("~/scripts/jquery.validate.min.js")
                .Include("~/scripts/jquery.validate.unobtrusive.min.js")
                .Include("~/scripts/jquery.unobtrusive-ajax.min.js")
                .Include("~/scripts/jquery-ui.js")
                .Include("~/scripts/bootstrap.min.js")
                .Include("~/scripts/jquery.signalR-2.4.0.min.js"));

            // Styles Bundles for custom styles
            bundles.Add(new StyleBundle("~/css/customs")
                .Include("~/Content/customs/blog.css",
                "~/Content/customs/codeeditor.css",
                "~/Content/customs/finance-styles.css",
                "~/Content/customs/pace.css",
                "~/Content/customs/site-wide.css"));
            
            // styles for the plugins
            bundles.Add(new StyleBundle("~/css/plugins")
                .Include("~/Content/jquery-ui.css")
                .Include("~/Content/bootstrap.min.css"));

            BundleTable.EnableOptimizations = false;
        }
    }
}
