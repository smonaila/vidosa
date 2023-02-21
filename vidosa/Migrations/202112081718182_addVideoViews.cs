namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addVideoViews : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.VideoViews",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        UserName = c.String(),
                        IPAddress = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.VideoViews");
        }
    }
}
