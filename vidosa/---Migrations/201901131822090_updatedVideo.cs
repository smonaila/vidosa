namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class updatedVideo : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Videos", "VideoId", c => c.String());
            AddColumn("dbo.Videos", "Url", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Videos", "Url");
            DropColumn("dbo.Videos", "VideoId");
        }
    }
}
