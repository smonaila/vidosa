namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addSEOTable : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.SEOs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        Blurb = c.String(),
                        Description = c.String(),
                        Keywords = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.SEOs");
        }
    }
}
