namespace vidosa.Migrations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Entity;
    using System.Data.Entity.Migrations;
    using System.Linq;
    using System.Security.Cryptography;
    using System.Text;
    using vidosa.Models;

    internal sealed class Configuration : DbMigrationsConfiguration<vidosa.Models.VidosaContext>
    {
        public Configuration()
        {
            AutomaticMigrationsEnabled = false;
        }

        protected override void Seed(vidosa.Models.VidosaContext context)
        {
            //  This method will be called after migrating to the latest version.
            //var vd = new List<VideoDetails>()
            //{
            //    new VideoDetails()
            //    {
            //        VideoId = "TW7qQIhAWOsQ703IWXCDvVOmUsE4NpJoQGvltDb8",
            //        HtmlContent = "<ul><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li></ul>",
            //    },
            //    new VideoDetails()
            //    {
            //        VideoId = "POMu7H9BLq9IeuyAtJYoyfcjjzUXqWoTG0tfFqODk",
            //        HtmlContent = "<ul><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li></ul>",
            //    },
            //    new VideoDetails()
            //    {
            //        VideoId = "c8XnPfCG8yHgR9QIz7MUhDOUqRc4dgEVJoQGvltDb8",
            //        HtmlContent = "<ul><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li><li>Learn How to code</li></ul>",
            //    }
            //};

            //context.VideoDetails.AddRange(vd);
            //context.SaveChanges();

            //  You can use the DbSet<T>.AddOrUpdate() helper extension method 
            //  to avoid creating duplicate seed data.
            //context.Videos.AddOrUpdate(new Video
            //{
            //    DatePublished = DateTime.Now.ToString(),
            //    Url = "/videos/file_dashed.mp4",
            //    Description = "testing video",
            //    Title = "test",
            //    VideoId = "hfsskeccd"
            //},
            //new Video
            //{
            //    DatePublished = DateTime.Now.ToString(),
            //    Url = "/videos/file_dashed.mp4",
            //    Description = "testing video",
            //    Title = "test",
            //    VideoId = "hfjruska"
            //},
            //new Video
            //{
            //    DatePublished = DateTime.Now.ToString(),
            //    Url = "/videos/file_dashed.mp4",
            //    Description = "testing video",
            //    Title = "test",
            //    VideoId = "hfsskeccd"
            //});

            //context.BandWidths.AddRange(new List<BandWidth>() {
            //    new BandWidth{ Name = "HD", Value = "HD"},
            //    new BandWidth{ Name = "400", Value = "400"},
            //    new BandWidth{ Name = "300", Value = "300"},
            //    new BandWidth{ Name = "200", Value = "200"}
            //});

            //Role[] roles = new Role[] 
            //{
            //    new Role()
            //    {
            //         RoleName = "Basic",
            //         // Users = context.Users.Where(u => u.IsActive== false).ToList()
            //    },
            //    new Role()
            //    {
            //        RoleName = "Admin",
            //        //Users = context.Users.Where(u => u.Email == "smonaila@hotmail.com").ToList()
            //    }
            //};
            //context.Roles.AddRange(roles.ToList());
            //context.SaveChanges();

            // Encryption Code
            //byte[] inputArray = UTF8Encoding.UTF8.GetBytes(string.Format("{0}{1}", ".NET Components - CLR, CLS and CTS", DateTime.Now.ToString()));
            //TripleDESCryptoServiceProvider tripleDES = new TripleDESCryptoServiceProvider();
            //tripleDES.Key = UTF8Encoding.UTF8.GetBytes("sblw-3hn8-sqoy19");
            //tripleDES.Mode = CipherMode.ECB;
            //tripleDES.Padding = PaddingMode.PKCS7;
            //ICryptoTransform cTransform = tripleDES.CreateEncryptor();
            //byte[] resultArray = cTransform.TransformFinalBlock(inputArray, 0, inputArray.Length);
            //tripleDES.Clear();

            //string videoId = Convert.ToBase64String(resultArray, 0, resultArray.Length);

            //var Video = context.Videos.Where(v => v.VideoId == "yrhffhss").FirstOrDefault();
            //Video.VideoId = videoId;
            //context.Entry(Video).State = EntityState.Modified;

        }
    }
}
