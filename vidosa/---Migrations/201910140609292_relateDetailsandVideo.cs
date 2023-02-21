namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class relateDetailsandVideo : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.VideoDetails", "Video_Id", c => c.Int());
            CreateIndex("dbo.VideoDetails", "Video_Id");
            AddForeignKey("dbo.VideoDetails", "Video_Id", "dbo.Videos", "Id");
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.VideoDetails", "Video_Id", "dbo.Videos");
            DropIndex("dbo.VideoDetails", new[] { "Video_Id" });
            DropColumn("dbo.VideoDetails", "Video_Id");
        }
    }
}
