namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addPremiumSubs : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.PremiumSubs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Username = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.PremiumSubs");
        }
    }
}
