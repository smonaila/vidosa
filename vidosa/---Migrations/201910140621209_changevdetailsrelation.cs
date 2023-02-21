namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class changevdetailsrelation : DbMigration
    {
        public override void Up()
        {
            DropForeignKey("dbo.VideoDetails", "Video_Id", "dbo.Videos");
            DropIndex("dbo.VideoDetails", new[] { "Video_Id" });
            DropColumn("dbo.VideoDetails", "Video_Id");
        }
        
        public override void Down()
        {
            AddColumn("dbo.VideoDetails", "Video_Id", c => c.Int());
            CreateIndex("dbo.VideoDetails", "Video_Id");
            AddForeignKey("dbo.VideoDetails", "Video_Id", "dbo.Videos", "Id");
        }
    }
}
