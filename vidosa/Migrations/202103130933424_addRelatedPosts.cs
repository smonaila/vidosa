namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addRelatedPosts : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.RelatedPosts",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        PostKey = c.String(),
                        PostId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.RelatedPosts");
        }
    }
}
