namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addVideoDetails : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.VideoDetails",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        HtmlContent = c.String(),
                    })
                .PrimaryKey(t => t.Id);
        }
        
        public override void Down()
        {
            DropTable("dbo.VideoDetails");
        }
    }
}
