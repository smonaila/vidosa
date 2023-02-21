namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddReactions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Reactions",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Reaction = c.Int(nullable: false),
                        ContentType = c.Int(nullable: false),
                        ContentId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.Reactions");
        }
    }
}
