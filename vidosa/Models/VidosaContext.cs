using Microsoft.AspNet.Identity.EntityFramework;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;
using vidosa.Areas.finance.Models;

namespace vidosa.Models
{
    public class VidosaContext : IdentityDbContext<ApplicationUser>
    {
        public VidosaContext():base("name=VidosaContext") { }

        public DbSet<Video> Videos { get; set; }
        public DbSet<BandWidth> BandWidths { get; set; }
        public DbSet<EmailList> Emails { get; set; }
        public DbSet<PremiumSubs> PremiumSubs { get; set; }
        public DbSet<Sales> Sales { get; set; }
        public DbSet<Orders> Orders { get; set; }
        public DbSet<VideoDetails> VideoDetails { get; set; }
        public DbSet<SEO> SEOs { get; set; }
        public DbSet<Transactions> Transactions { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<PostSEO> PostSEOs { get; set; }
        public DbSet<RelatedPosts> RelatedPosts { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<CommentReply> CommentReplies { get; set; }
        public DbSet<ConnectionIds> ConnectionIds { get; set; }
        public DbSet<Redirect> Redirects { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Chapter> Chapters { get; set; }
        public DbSet<ChannelSubs> ChannelSubs { get; set; }
        public DbSet<Reactions> Reactions { get; set; }
        public DbSet<VideoViews> VideoViews { get; set; }
        public DbSet<Bot> Bots { get; set; }

        public static ApplicationDbContext Create()
        {
            return new ApplicationDbContext();
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}