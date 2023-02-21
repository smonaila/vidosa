namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class bandwidth : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.BandWidths",
                c => new
                    {
                        BandwidthId = c.Int(nullable: false, identity: true),
                        Name = c.String(),
                        Value = c.String(),
                    })
                .PrimaryKey(t => t.BandwidthId);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.BandWidths");
        }
    }
}
