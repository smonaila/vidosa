namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addPostSEOs : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.PostSEOs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        PostId = c.Int(nullable: false),
                        Title = c.String(),
                        Blurb = c.String(),
                        Keywords = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.PostSEOs");
        }
    }
}
